/**
 * Copyright (c) 2018-2025 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Andy Turner <agdturner@gmail.com>
 */
import { Vec3, Mat4 } from '../../../../mol-math/linear-algebra';
import { alignDatasetsGeneral, alignDatasetUsingChains, computeCentroid } from '../geometry';

describe('rigid alignment coordinate mapping', () => {
    test.each(['equal', 'extra moving', 'extra reference'])('maps all atoms with %s selected counts', counts => {
        const reference = [
            { type: 'P', x: 3, y: -2, z: 7 },
            { type: 'P', x: 7, y: -1, z: 8 },
            { type: 'P', x: 4, y: 3, z: 9 },
            { type: 'P', x: 2, y: 0, z: 13 },
            { type: 'C', x: 8, y: 5, z: 4 },
        ];
        const moving = reference.map(atom => ({
            type: atom.type, x: -atom.y + 20, y: atom.x - 11, z: atom.z + 6,
        }));
        if (counts === 'extra moving') moving.push({ type: 'P', x: 100, y: -80, z: 60 });
        if (counts === 'extra reference') reference.push({ type: 'P', x: -90, y: 70, z: 50 });
        const before = moving.map(atom => ({ ...atom }));
        const result = alignDatasetsGeneral(moving, reference, atom => atom.type === 'P');
        expect(moving).toEqual(before);
        expect(result.alignedX.length).toBe(moving.length);
        for (let i = 0; i < moving.length; i++) {
            expect(result.alignedX[i]).toBeCloseTo(moving[i].y + 11, 6);
            expect(result.alignedY[i]).toBeCloseTo(20 - moving[i].x, 6);
            expect(result.alignedZ[i]).toBeCloseTo(moving[i].z - 6, 6);
        }
    });
});

describe('computeCentroid', () => {
    test('computes centroid of given coordinates', () => {
        const coords = [Vec3.create(1, 2, 3), Vec3.create(4, 5, 6), Vec3.create(7, 8, 9)];
        const centroid = computeCentroid(coords);
        expect(centroid).toEqual(Vec3.create(4, 5, 6));
    });
});

describe('alignDatasetUsingChains', () => {
    test('preserves pure translation when coordinates differ by a fixed offset', () => {
        const movingTypes = ['P', 'P', 'P', 'P'];
        const movingChainIds = ['A', 'A', 'A', 'A'];
        const movingX = [10, 11, 10, 10];
        const movingY = [20, 20, 21, 20];
        const movingZ = [30, 30, 30, 31];

        const referenceTypes = ['P', 'P', 'P', 'P'];
        const referenceChainIds = ['B', 'B', 'B', 'B'];
        const referenceX = [0, 1, 0, 0];
        const referenceY = [0, 0, 1, 0];
        const referenceZ = [0, 0, 0, 1];

        const result = alignDatasetUsingChains(
            { P: true },
            'A',
            movingTypes,
            movingChainIds,
            movingX,
            movingY,
            movingZ,
            'B',
            referenceTypes,
            referenceChainIds,
            referenceX,
            referenceY,
            referenceZ
        );

        for (let i = 0; i < referenceX.length; i++) {
            expect(result.alignedX[i]).toBeCloseTo(referenceX[i], 6);
            expect(result.alignedY[i]).toBeCloseTo(referenceY[i], 6);
            expect(result.alignedZ[i]).toBeCloseTo(referenceZ[i], 6);
        }
    });

    test('uses translation-only alignment for single-atom fallback selections', () => {
        const movingTypes = ['N', 'C', 'P'];
        const movingChainIds = ['A', 'A', 'A'];
        const movingX = [10, 20, 30];
        const movingY = [5, 6, 7];
        const movingZ = [1, 2, 3];

        const referenceTypes = ['N', 'C', 'P'];
        const referenceChainIds = ['B', 'B', 'B'];
        const referenceX = [100, 200, 300];
        const referenceY = [50, 60, 70];
        const referenceZ = [11, 12, 13];

        const result = alignDatasetUsingChains(
            { O: true },
            'A',
            movingTypes,
            movingChainIds,
            movingX,
            movingY,
            movingZ,
            'B',
            referenceTypes,
            referenceChainIds,
            referenceX,
            referenceY,
            referenceZ
        );

        for (let i = 0; i < movingX.length; i++) {
            expect(Number.isFinite(result.alignedX[i])).toBe(true);
            expect(Number.isFinite(result.alignedY[i])).toBe(true);
            expect(Number.isFinite(result.alignedZ[i])).toBe(true);
        }

        const dx = result.centroidReference[0] - result.centroid[0];
        const dy = result.centroidReference[1] - result.centroid[1];
        const dz = result.centroidReference[2] - result.centroid[2];

        for (let i = 0; i < movingX.length; i++) {
            expect(result.alignedX[i]).toBeCloseTo(movingX[i] + dx, 6);
            expect(result.alignedY[i]).toBeCloseTo(movingY[i] + dy, 6);
            expect(result.alignedZ[i]).toBeCloseTo(movingZ[i] + dz, 6);
        }

        expect(result.rotmat).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    });
});