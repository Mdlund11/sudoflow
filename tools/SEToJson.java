import diuf.sudoku.Grid;
import diuf.sudoku.solver.Solver;
import java.io.FileWriter;
import java.lang.reflect.Array;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;

class JsonBuilder {
    public static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ");
    }
}

public class SEToJson {

    // --- CONFIGURATION ---
    private static final double MAX_DIFFICULTY = 7.5; 
    private static final int MAX_PUZZLES_TO_EXPORT = 50;

    public static void main(String[] args) throws Exception {
        String inputPath = "top1465.txt";
        String outputPath = "sudoflow_test_data.json";
        
        System.out.println("Configuring SE settings...");
        try {
            Class<?> settingsClass = Class.forName("diuf.sudoku.Settings");
            Method getInstance = settingsClass.getMethod("getInstance");
            Object settingsInstance = getInstance.invoke(null);
            try { settingsClass.getMethod("setSell", boolean.class).invoke(settingsInstance, false); } catch (Exception ignored) {}
        } catch (Exception e) {
            System.out.println("Note: Settings configuration skipped.");
        }

        List<String> puzzles = Files.readAllLines(Paths.get(inputPath));
        FileWriter writer = new FileWriter(outputPath);
        writer.write("[\n");
        writer.flush();

        int processedCount = 0;
        int validCount = 0;
        Object dummyAsker = createRobustDummyAsker();

        for (String puzzleStr : puzzles) {
            if (puzzleStr.length() < 81) continue;
            if (validCount >= MAX_PUZZLES_TO_EXPORT) break;
            
            processedCount++;
            System.out.print("Processing Puzzle #" + processedCount + "... ");
            
            // 1. GET GROUND TRUTH (STRICT)
            double engineRating = getAggressiveRating(puzzleStr, dummyAsker);
            
            // CRITICAL CHECK: Did we fail to get the rating?
            if (engineRating == -1.0) {
                System.out.println("\n[FAILURE] Could not retrieve Engine Rating for Puzzle #" + processedCount);
                System.out.println("  -> Debug: analyse() returned void/null and getDifficulty() returned 0.0");
                // We stop processing this puzzle because we can't validate it.
                continue;
            }

            // Filter
            if (engineRating > MAX_DIFFICULTY) {
                System.out.println("[SKIPPED] (Engine Rating " + engineRating + " > " + MAX_DIFFICULTY + ")");
                continue;
            }

            // 2. GENERATE MANUAL STEPS
            try {
                String json = solveAndSerialize(processedCount, puzzleStr, dummyAsker, engineRating);
                
                if (json != null) {
                    if (validCount > 0) writer.write(",\n");
                    writer.write(json);
                    writer.flush(); 
                    validCount++;
                    System.out.println("[ACCEPTED] (Engine: " + engineRating + ")");
                } else {
                    System.out.println("[SKIPPED] (Step > " + MAX_DIFFICULTY + ")");
                }
            } catch (Exception e) {
                System.err.println("\nError processing #" + processedCount + ": " + e.getMessage());
            }
        }

        writer.write("\n]");
        writer.close();
        System.out.println("\nDone! Scanned " + processedCount + " inputs. Exported " + validCount + " valid puzzles.");
    }

    // --- 1. AGGRESSIVE RATING FETCHER ---
    private static double getAggressiveRating(String gridStr, Object dummyAsker) {
        try {
            Grid grid = loadGrid(gridStr);
            Solver solver = new Solver(grid);
            initSolver(solver);
            Class<?> askerInterface = (Class<?>) dummyAsker.getClass().getInterfaces()[0];

            // Strategy A: analyse(Asker) -> returns double?
            try {
                Method analyse = Solver.class.getMethod("analyse", askerInterface);
                Object res = analyse.invoke(solver, dummyAsker);
                if (res instanceof Number) return ((Number) res).doubleValue();
            } catch (Exception ignored) {}

            // Strategy B: analyse() (No args) -> returns double?
            try {
                Method analyseNoArgs = Solver.class.getMethod("analyse");
                Object res = analyseNoArgs.invoke(solver);
                if (res instanceof Number) return ((Number) res).doubleValue();
            } catch (Exception ignored) {}

            // Strategy C: Check 'difficulty' via Getter
            double d = getDifficulty(solver);
            if (d > 0.0) return d;

            // Strategy D: DIRECT FIELD ACCESS (The "Heist" maneuver)
            // If the getter is broken, steal the value directly from the private variable.
            try {
                Field f = Solver.class.getDeclaredField("difficulty");
                f.setAccessible(true);
                double stolenVal = f.getDouble(solver);
                if (stolenVal > 0.0) return stolenVal;
            } catch (Exception ignored) {}

            return -1.0; // TOTAL FAILURE
        } catch (Exception e) {
            e.printStackTrace();
            return -1.0;
        }
    }

    // --- 2. STEP GENERATOR ---
    private static String solveAndSerialize(int id, String initialGrid, Object dummyAsker, double engineRating) throws Exception {
        Grid grid = loadGrid(initialGrid);
        Solver solver = new Solver(grid);
        initSolver(solver);

        Class<?> askerInterface = (Class<?>) dummyAsker.getClass().getInterfaces()[0];
        Method getAllHintsMethod = Solver.class.getMethod("getAllHints", askerInterface);

        StringBuilder sb = new StringBuilder();
        sb.append("  {\n");
        sb.append("    \"id\": ").append(id).append(",\n");
        sb.append("    \"initial_grid\": \"").append(initialGrid).append("\",\n");
        sb.append("    \"steps\": [\n");

        boolean firstStep = true;
        double manualMaxRating = 0.0;
        int stepCount = 0;

        while (!grid.isSolved()) {
            Object bestHint = null;
            Object hintsCollection = getAllHintsMethod.invoke(solver, dummyAsker);
            
            if (hintsCollection != null) {
                double minDiff = Double.MAX_VALUE;
                if (hintsCollection instanceof List) {
                    List<?> list = (List<?>) hintsCollection;
                    for (Object h : list) {
                        if (isWarning(h)) continue;
                        double d = getDifficulty(h);
                        if (d < minDiff) { minDiff = d; bestHint = h; }
                    }
                } else if (hintsCollection.getClass().isArray()) {
                    int len = Array.getLength(hintsCollection);
                    for (int i = 0; i < len; i++) {
                        Object h = Array.get(hintsCollection, i);
                        if (isWarning(h)) continue;
                        double d = getDifficulty(h);
                        if (d < minDiff) { minDiff = d; bestHint = h; }
                    }
                }
            }

            if (bestHint == null) break;

            double currentDiff = getDifficulty(bestHint);
            
            // Filter logic
            if (currentDiff > MAX_DIFFICULTY) return null;

            if (currentDiff > manualMaxRating) manualMaxRating = currentDiff;

            String name = (String) bestHint.getClass().getMethod("getName").invoke(bestHint);
            
            if (!firstStep) sb.append(",\n");
            
            String details = getDetails(bestHint, grid);
            
            sb.append("      {\n");
            sb.append("        \"technique\": \"").append(JsonBuilder.escape(name)).append("\",\n");
            sb.append("        \"difficulty\": ").append(currentDiff).append(",\n");
            sb.append("        \"description\": \"").append(JsonBuilder.escape(details)).append("\"\n");
            sb.append("      }");

            try {
                bestHint.getClass().getMethod("apply", Grid.class).invoke(bestHint, grid);
            } catch (Exception e) {
                bestHint.getClass().getMethod("apply").invoke(bestHint);
            }
            
            firstStep = false;
            stepCount++;
            if (stepCount > 300) return null; 
        }

        boolean valid = (engineRating > 0.0) && (Math.abs(manualMaxRating - engineRating) < 0.001);

        sb.append("\n    ],\n");
        sb.append("    \"engine_rating\": ").append(engineRating).append(",\n");
        sb.append("    \"manual_rating\": ").append(manualMaxRating).append(",\n");
        sb.append("    \"valid\": ").append(valid).append("\n");
        sb.append("  }");
        return sb.toString();
    }

    // --- UTILITIES ---

    private static Object createRobustDummyAsker() throws Exception {
        Class<?> askerInterface = Class.forName("diuf.sudoku.tools.Asker");
        return Proxy.newProxyInstance(
            SEToJson.class.getClassLoader(),
            new Class<?>[]{askerInterface},
            (proxy, method, args) -> {
                Class<?> type = method.getReturnType();
                if (type == boolean.class) return true;
                if (type == int.class) return 0;
                if (type == double.class) return 0.0;
                if (type == String.class) return "";
                if (!type.isPrimitive()) return null;
                return false;
            }
        );
    }

    private static Grid loadGrid(String initialGrid) {
        Grid grid = new Grid();
        for (int i = 0; i < 81; i++) {
            char c = initialGrid.charAt(i);
            int val = (c >= '1' && c <= '9') ? (c - '0') : 0;
            grid.setCellValue(i, val);
        }
        return grid;
    }

    private static void initSolver(Solver solver) {
        try { Solver.class.getMethod("rebuildPotentialValues").invoke(solver); } catch (Exception ignored) {}
        try { Solver.class.getMethod("rebuild").invoke(solver); } catch (Exception ignored) {}
    }

    private static boolean isWarning(Object hint) {
        try {
            hint.getClass().getMethod("getDifficulty");
            return false;
        } catch (NoSuchMethodException e) {
            return true;
        }
    }

    private static double getDifficulty(Object obj) {
        try {
            Object res = obj.getClass().getMethod("getDifficulty").invoke(obj);
            if (res == null) return 0.0;
            return (double) res;
        } catch (Exception e) {
            return 0.0;
        }
    }
    
    private static String getDetails(Object hint, Grid grid) {
        String details = "";
        try {
            details = (String) hint.getClass().getMethod("toHtml", Grid.class).invoke(hint, grid);
        } catch (Exception e) {
            try {
                details = (String) hint.getClass().getMethod("toHtml").invoke(hint);
            } catch (Exception ex) {
                details = hint.toString();
            }
        }
        if (details != null) return details.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
        return "";
    }
}