/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License. */

import { shuffle } from 'lodash';

import { mergePartial } from '../../utils/commons';
import {
  DataSeries,
  DataSeriesDatum,
  RawDataSeries,
  RawDataSeriesDatum,
} from '../../chart_types/xy_chart/utils/series';
import { fitFunctionData } from './data';
import { FullDataSeriesDatum, WithIndex } from '../../chart_types/xy_chart/utils/fit_function';
import { getRandomNumberGenerator } from '../utils';

const rng = getRandomNumberGenerator();

interface DomainRange {
  min?: number;
  max?: number;
  fractionDigits?: number;
  inclusive?: boolean;
}

/** @internal */
export class MockDataSeries {
  private static readonly base: DataSeries = {
    specId: 'spec1',
    seriesKeys: ['spec1'],
    yAccessor: 'y',
    splitAccessors: new Map(),
    key: 'spec1',
    data: [],
  };

  static default(partial?: Partial<DataSeries>) {
    return mergePartial<DataSeries>(MockDataSeries.base, partial, { mergeOptionalPartialValues: true });
  }

  static fitFunction(
    options: { shuffle?: boolean; ordinal?: boolean } = { shuffle: true, ordinal: false },
  ): DataSeries {
    const ordinalData = options.ordinal
      ? fitFunctionData.map((d) => ({ ...d, x: String.fromCharCode(97 + (d.x as number)) }))
      : fitFunctionData;
    const data = options.shuffle && !options.ordinal ? shuffle(ordinalData) : ordinalData;

    return {
      ...MockDataSeries.base,
      data,
    };
  }

  static fromData(data: DataSeries['data']): DataSeries {
    return {
      ...MockDataSeries.base,
      data,
    };
  }

  static random(
    options: { count?: number; x?: DomainRange; y?: DomainRange; mark?: DomainRange },
    includeMarks = false,
  ): DataSeries {
    const data = new Array(options?.count ?? 10).fill(0).map(() => MockDataSeriesDatum.random(options, includeMarks));
    return {
      ...MockDataSeries.base,
      data,
    };
  }
}

type RawDataSeriesPartialData = Omit<RawDataSeries, 'data'> & {
  data: Partial<RawDataSeriesDatum>[];
};

/** @internal */
export class MockRawDataSeries {
  private static readonly base: RawDataSeries = {
    specId: 'spec1',
    seriesKeys: ['spec1'],
    yAccessor: 'y',
    splitAccessors: new Map(),
    key: 'spec1',
    data: [],
  };

  static default({ data, ...partial }: Partial<RawDataSeriesPartialData>): RawDataSeries {
    return {
      ...MockRawDataSeries.base,
      ...partial,
      ...(data && {
        data: data.map((datum) => MockRawDataSeriesDatum.default(datum)),
      }),
    };
  }

  static defaults(partials: Partial<RawDataSeriesPartialData>[], defaults?: Partial<RawDataSeries>): RawDataSeries[] {
    return partials.map((partial) => {
      return MockRawDataSeries.default({
        ...defaults,
        ...partial,
      });
    });
  }

  static fitFunction(
    options: { shuffle?: boolean; ordinal?: boolean } = { shuffle: true, ordinal: false },
  ): RawDataSeries {
    const rawData = fitFunctionData.map(({ initialY0, initialY1, filled, ...datum }) => datum);
    const ordinalData = options.ordinal
      ? rawData.map((d) => ({ ...d, x: String.fromCharCode(97 + (d.x as number)) }))
      : rawData;
    const data = options.shuffle && !options.ordinal ? shuffle(ordinalData) : ordinalData;

    return {
      ...MockRawDataSeries.base,
      data,
    };
  }

  static fromData<T extends Partial<RawDataSeriesDatum>[] | Partial<RawDataSeriesDatum>[][]>(
    data: T,
    defaults?: Partial<Omit<RawDataSeries, 'data'>>,
  ): T extends Partial<RawDataSeriesDatum>[] ? RawDataSeries : RawDataSeries[] {
    const mergedDefault: RawDataSeries = {
      ...MockRawDataSeries.base,
      ...defaults,
    };

    if (Array.isArray(data) && data[0] && Array.isArray(data[0])) {
      return (data as Partial<RawDataSeriesDatum>[][]).map((d, i) => ({
        ...mergedDefault,
        specId: `spec${i + 1}`,
        key: `key${i + 1}`,
        data: d.map((datum) => MockRawDataSeriesDatum.default(datum)),
      })) as any;
    }

    return {
      ...mergedDefault,
      data: [MockRawDataSeriesDatum.default(data as any)],
    } as any;
  }
}

/** @internal */
export class MockDataSeriesDatum {
  private static readonly base: DataSeriesDatum = {
    x: 1,
    y1: 1,
    y0: null,
    mark: null,
    initialY1: null,
    initialY0: 1,
    datum: null,
  };

  static default(partial?: Partial<DataSeriesDatum>): DataSeriesDatum {
    return mergePartial<DataSeriesDatum>(MockDataSeriesDatum.base, partial, { mergeOptionalPartialValues: true });
  }

  /**
   * Fill datum with minimal values, default missing required values to `null`
   */
  static simple({
    x,
    y1 = null,
    y0 = null,
    mark = null,
    filled,
  }: Partial<DataSeriesDatum> & Pick<DataSeriesDatum, 'x'>): DataSeriesDatum {
    return {
      x,
      y1,
      y0,
      mark,
      initialY1: y1,
      initialY0: y0,
      datum: {
        x,
        y1,
        y0,
      },
      ...(filled && filled),
    };
  }

  /**
   * returns "full" datum with minimal values, default missing required values to `null`
   *
   * "full" - means x and y1 values are `non-nullable`
   */
  static full({
    fittingIndex = 0,
    ...datum
  }: Partial<WithIndex<FullDataSeriesDatum>> & Pick<WithIndex<FullDataSeriesDatum>, 'x' | 'y1'>): WithIndex<
    FullDataSeriesDatum
  > {
    return {
      ...(MockDataSeriesDatum.simple(datum) as WithIndex<FullDataSeriesDatum>),
      fittingIndex,
    };
  }

  static ordinal(partial?: Partial<DataSeriesDatum>): DataSeriesDatum {
    return mergePartial<DataSeriesDatum>(
      {
        ...MockDataSeriesDatum.base,
        x: 'a',
      },
      partial,
      { mergeOptionalPartialValues: true },
    );
  }

  /**
   * Psuedo-random values between a specified domain
   *
   * @param options
   */
  static random(
    options: { x?: DomainRange; y?: DomainRange; mark?: DomainRange },
    includeMark = false,
  ): DataSeriesDatum {
    return MockDataSeriesDatum.simple({
      x: rng(options?.x?.min, options?.x?.max, options.x?.fractionDigits, options.x?.inclusive),
      y1: rng(options?.y?.min, options?.y?.max, options.y?.fractionDigits, options.y?.inclusive),
      ...(includeMark && {
        mark: rng(options?.mark?.min, options?.mark?.max, options.mark?.fractionDigits, options.mark?.inclusive),
      }),
    });
  }
}

/** @internal */
export class MockRawDataSeriesDatum {
  private static readonly base: RawDataSeriesDatum = {
    x: 1,
    y1: 1,
    y0: null,
    mark: null,
    datum: {
      x: 1,
      y1: 1,
      y0: 1,
    },
  };

  static default(partial?: Partial<RawDataSeriesDatum>): RawDataSeriesDatum {
    return mergePartial<RawDataSeriesDatum>(MockRawDataSeriesDatum.base, partial);
  }

  /**
   * Fill raw datum with minimal values, default missing required values to `null`
   */
  static simple({
    x,
    y1 = null,
    y0 = null,
  }: Partial<RawDataSeriesDatum> & Pick<RawDataSeriesDatum, 'x'>): RawDataSeriesDatum {
    return {
      x,
      y1,
      y0,
      mark: null,
      datum: {
        x: 1,
        y1: 1,
        y0: 1,
      },
    };
  }

  static ordinal(partial?: Partial<RawDataSeriesDatum>): RawDataSeriesDatum {
    return mergePartial<RawDataSeriesDatum>(
      {
        ...MockRawDataSeriesDatum.base,
        x: 'a',
      },
      partial,
    );
  }
}
