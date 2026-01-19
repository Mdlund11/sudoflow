import {
    getChainLengthPenalty,
    getCombinations,
    getCommonHouse,
    getCommonPeers,
    getHouseCells,
    getPeers,
    GridModelV4,
    sees
} from '../solver-v4';

describe('Solver V4 Shared Utilities', () => {

    describe('getCombinations', () => {
        it('should return correct combinations of size 2', () => {
            const arr = [1, 2, 3];
            const result = getCombinations(arr, 2);
            expect(result).toHaveLength(3);
            expect(result).toContainEqual([1, 2]);
            expect(result).toContainEqual([1, 3]);
            expect(result).toContainEqual([2, 3]);
        });

        it('should return correct combinations of size 3', () => {
            const arr = [1, 2, 3, 4];
            const result = getCombinations(arr, 3);
            expect(result).toHaveLength(4);
            expect(result).toContainEqual([1, 2, 3]);
            expect(result).toContainEqual([1, 2, 4]);
            expect(result).toContainEqual([1, 3, 4]);
            expect(result).toContainEqual([2, 3, 4]);
        });
    });

    describe('getChainLengthPenalty', () => {
        it('should return 0.0 for lengths <= 4', () => {
            expect(getChainLengthPenalty(1)).toBe(0.0);
            expect(getChainLengthPenalty(4)).toBe(0.0);
        });

        it('should return 0.1 for lengths 5 and 6', () => {
            expect(getChainLengthPenalty(5)).toBe(0.1);
            expect(getChainLengthPenalty(6)).toBe(0.1);
        });

        it('should return 0.2 for lengths 7 and 8', () => {
            expect(getChainLengthPenalty(7)).toBe(0.2);
            expect(getChainLengthPenalty(8)).toBe(0.2);
        });

        it('should return 0.3 for lengths 9 to 12', () => {
            expect(getChainLengthPenalty(9)).toBe(0.3);
            expect(getChainLengthPenalty(12)).toBe(0.3);
        });

        it('should match SE logarithmic-like growth example 14 -> 0.4', () => {
            expect(getChainLengthPenalty(14)).toBe(0.4);
        });

        it('should reach higher penalties correctly', () => {
            expect(getChainLengthPenalty(17)).toBe(0.5);
            expect(getChainLengthPenalty(25)).toBe(0.6);
        });
    });

    describe('GridModelV4 Utility Methods', () => {
        it('countSetBits should correctly count bits', () => {
            expect(GridModelV4.countSetBits(0)).toBe(0);
            expect(GridModelV4.countSetBits(1)).toBe(1);
            expect(GridModelV4.countSetBits(0x1FF)).toBe(9);
            expect(GridModelV4.countSetBits(5)).toBe(2);
        });

        it('getVals should return correct array of candidate digits', () => {
            expect(GridModelV4.getVals(0)).toEqual([]);
            expect(GridModelV4.getVals(1)).toEqual([1]);
            expect(GridModelV4.getVals(1 << 8)).toEqual([9]);
            expect(GridModelV4.getVals((1 << 0) | (1 << 4) | (1 << 8))).toEqual([1, 5, 9]);
        });
    });

    describe('House and Peer Utilities', () => {
        it('getHouseCells should return correct indices', () => {
            expect(getHouseCells(0)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
            expect(getHouseCells(9)).toEqual([0, 9, 18, 27, 36, 45, 54, 63, 72]);
            expect(getHouseCells(18)).toEqual([0, 1, 2, 9, 10, 11, 18, 19, 20]);
        });

        it('getPeers should return 20 unique peers for a cell', () => {
            const p = getPeers(0);
            expect(p.length).toBe(20);
            expect(new Set(p).size).toBe(20);
            expect(p).toContain(1);
            expect(p).toContain(9);
            expect(p).toContain(10);
            expect(p).not.toContain(0);
        });

        it('sees should correctly detect if two cells share a house', () => {
            expect(sees(0, 1)).toBe(true);
            expect(sees(0, 9)).toBe(true);
            expect(sees(0, 10)).toBe(true);
            expect(sees(0, 22)).toBe(false);
        });

        it('getCommonHouse should return the common house index or -1', () => {
            expect(getCommonHouse(0, 1)).toBe(0);
            expect(getCommonHouse(0, 9)).toBe(9);
            expect(getCommonHouse(0, 10)).toBe(18);
            expect(getCommonHouse(0, 22)).toBe(-1);
        });

        it('getCommonPeers should return the intersection of peers', () => {
            const common = getCommonPeers(0, 1);
            expect(common).toContain(2);
            expect(common).toContain(9);
            expect(common).toContain(10);
            expect(common).toContain(18);
        });
    });
});
