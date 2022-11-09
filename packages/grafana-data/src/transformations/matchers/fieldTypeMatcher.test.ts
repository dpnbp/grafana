import { toDataFrame } from '../../dataframe/processDataFrame';
import { FieldType } from '../../types/dataFrame';
import { fieldMatchers } from '../matchers';

import { FieldMatcherID } from './ids';

export const simpleSeriesWithTypes = toDataFrame({
  fields: [
    { name: 'A', type: FieldType.time },
    { name: 'B', type: FieldType.boolean },
    { name: 'C', type: FieldType.string },
  ],
});

describe('Field Type Matcher', () => {
  const matcher = fieldMatchers.get(FieldMatcherID.byType);
  it('finds numbers', () => {
    for (const field of simpleSeriesWithTypes.fields) {
      const matches = matcher.get(FieldType.number);
      const didMatch = matches(field, simpleSeriesWithTypes, [simpleSeriesWithTypes]);
      expect(didMatch).toBe(field.type === FieldType.number);
    }
  });
});

describe('Numeric Field Matcher', () => {
  const matcher = fieldMatchers.get(FieldMatcherID.numeric);
  it('finds numbers', () => {
    for (const field of simpleSeriesWithTypes.fields) {
      const matches = matcher.get();
      const didMatch = matches(field, simpleSeriesWithTypes, [simpleSeriesWithTypes]);
      expect(didMatch).toBe(field.type === FieldType.number);
    }
  });
});

describe('Time Field Matcher', () => {
  const matcher = fieldMatchers.get(FieldMatcherID.time);
  it('finds times', () => {
    for (const field of simpleSeriesWithTypes.fields) {
      const matches = matcher.get();
      const didMatch = matches(field, simpleSeriesWithTypes, [simpleSeriesWithTypes]);
      expect(didMatch).toBe(field.type === FieldType.time);
    }
  });
});
