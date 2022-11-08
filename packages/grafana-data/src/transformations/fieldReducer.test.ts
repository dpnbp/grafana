import { difference } from 'lodash';

import { MutableDataFrame } from '../dataframe/MutableDataFrame';
import { guessFieldTypeFromValue } from '../dataframe/processDataFrame';
import { Field, FieldType } from '../types/index';
import { ArrayVector } from '../vector/ArrayVector';

import { fieldReducers, ReducerID, reduceField } from './fieldReducer';

/**
 * Run a reducer and get back the value
 */
function reduce(field: Field, id: string): any {
  return reduceField({ field, reducers: [id] })[id];
}

function createField<T>(name: string, values?: T[], type?: FieldType): Field<T> {
  const arr = new ArrayVector(values);
  return {
    name,
    config: {},
    type: type ? type : guessFieldTypeFromValue(arr.get(0)),
    values: arr,
  };
}

describe('Stats Calculators', () => {
  const basicTable = new MutableDataFrame({
    fields: [
      { name: 'a', values: [10, 20] },
      { name: 'b', values: [20, 30] },
      { name: 'c', values: [30, 40] },
    ],
  });

  it('should load all standard stats', () => {
    for (const id of Object.keys(ReducerID)) {
      const reducer = fieldReducers.getIfExists(id);
      const found = reducer ? reducer.id : '<NOT FOUND>';
      expect(found).toEqual(id);
    }
  });

  it('should fail to load unknown stats', () => {
    const names = ['not a stat', ReducerID.max, ReducerID.min, 'also not a stat'];
    const stats = fieldReducers.list(names);
    expect(stats.length).toBe(2);

    const found = stats.map((v) => v.id);
    const notFound = difference(names, found);
    expect(notFound.length).toBe(2);

    expect(notFound[0]).toBe('not a stat');
  });

  it('should calculate basic stats', () => {
    const stats = reduceField({
      field: basicTable.fields[0],
      reducers: ['first', 'last', 'mean', 'count'],
    });

    expect(stats.first).toEqual(10);
    expect(stats.last).toEqual(20);
    expect(stats.mean).toEqual(15);
    expect(stats.count).toEqual(2);
  });

  it('should support a single stat also', () => {
    basicTable.fields[0].state = undefined; // clear the cache
    const stats = reduceField({
      field: basicTable.fields[0],
      reducers: ['first'],
    });

    // Should do the simple version that just looks up value
    expect(Object.keys(stats).length).toEqual(1);
    expect(stats.first).toEqual(10);
  });

  it('should get non standard stats', () => {
    const stats = reduceField({
      field: basicTable.fields[0],
      reducers: [ReducerID.distinctCount, ReducerID.changeCount, ReducerID.variance, ReducerID.stdDev],
    });

    expect(stats.distinctCount).toEqual(2);
    expect(stats.changeCount).toEqual(1);
    expect(stats.variance).toEqual(25);
    expect(stats.stdDev).toEqual(5);
  });

  it('should provide minimum above zero', () => {
    const stats = reduceField({
      field: createField('x', [-1, 1, 2, 2, 3, 1]),
      reducers: [ReducerID.logmin],
    });

    expect(stats.logmin).toEqual(1);
  });

  it('should calculate step', () => {
    const stats = reduceField({
      field: createField('x', [100, 200, 300, 400]),
      reducers: [ReducerID.step, ReducerID.delta],
    });

    expect(stats.step).toEqual(100);
    expect(stats.delta).toEqual(300);
  });

  it('should calculate unique values', () => {
    const stats = reduceField({
      field: createField('x', [1, 2, 2, 3, 1]),
      reducers: [ReducerID.uniqueValues],
    });

    expect(stats.uniqueValues).toEqual([1, 2, 3]);
  });

  it('should provide all values', () => {
    const stats = reduceField({
      field: createField('x', [1, 2, 2, 3, 1]),
      reducers: [ReducerID.allValues],
    });

    expect(stats.allValues).toEqual([1, 2, 2, 3, 1]);
  });

  it('consistently check allIsNull/allIsZero', () => {
    const empty = createField('x');
    const allNull = createField('x', [null, null, null, null]);
    const allUndefined = createField('x', [undefined, undefined, undefined, undefined]);
    const allZero = createField('x', [0, 0, 0, 0]);

    expect(reduce(empty, ReducerID.allIsNull)).toEqual(true);
    expect(reduce(allNull, ReducerID.allIsNull)).toEqual(true);
    expect(reduce(allUndefined, ReducerID.allIsNull)).toEqual(true);

    expect(reduce(empty, ReducerID.allIsZero)).toEqual(false);
    expect(reduce(allNull, ReducerID.allIsZero)).toEqual(false);
    expect(reduce(allZero, ReducerID.allIsZero)).toEqual(true);
  });

  it('consistent results for first/last value with null', () => {
    const info = [
      createField('x', [null, 200, 400, null]), // first/last value is null
      createField('x', [null, null, null]), // All null
      createField('x', [undefined, undefined, undefined]), // Empty row
    ];

    expect(reduce(info[0], ReducerID.firstNotNull)).toEqual(200);
    expect(reduce(info[0], ReducerID.lastNotNull)).toEqual(400);
    expect(reduce(info[0], ReducerID.diffperc)).toEqual(1);

    expect(reduce(info[1], ReducerID.firstNotNull)).toEqual(null);
    expect(reduce(info[1], ReducerID.lastNotNull)).toEqual(null);
    expect(reduce(info[1], ReducerID.diffperc)).toEqual(0);

    expect(reduce(info[2], ReducerID.firstNotNull)).toEqual(null);
    expect(reduce(info[2], ReducerID.lastNotNull)).toEqual(null);
    expect(reduce(info[2], ReducerID.diffperc)).toEqual(0);
  });
});
