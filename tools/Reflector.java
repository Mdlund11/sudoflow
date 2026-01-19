
import java.lang.reflect.Method;

public class Reflector {
    public static void main(String[] args) {
        try {
            printMethods("diuf.sudoku.Grid");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void printMethods(String className) {
        try {
            Class<?> c = Class.forName(className);
            System.out.println("Methods of " + className + ":");
            for (Method m : c.getMethods()) {
                if (m.getName().startsWith("set")) {
                    System.out.println("  " + m.getName() + " (" + m.getParameterCount() + " params)");
                }
            }
        } catch (ClassNotFoundException e) {
            System.out.println(className + " not found.");
        }
    }
}
