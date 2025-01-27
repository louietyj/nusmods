import { Client } from '@elastic/elasticsearch';
import { flatMap } from 'lodash';

// Source: https://github.com/lodash/lodash/issues/2339#issuecomment-319536784
const intersperse = <T>(arr: Array<T>, inter: T) => flatMap(arr, (a) => [inter, a]);

// Tokenizes a string into an array of digits
const first_digit_tokenizer = {
  type: 'simple_pattern',
  pattern: '[1-9]{1}',
};

// Only pick the first token
const first_token_limit_filter = {
  type: 'limit',
  max_token_count: 1,
};

// Add 3 '0's to a number token
const thousandizer_filter = {
  type: 'pattern_replace',
  pattern: '(\\d+)',
  replacement: '$1000',
};

export default async function importData(client: Client, data: any) {
  const importableData = data.map((mod: any) => {
    if (!mod.attributes) return mod;
    return {
      ...mod,
      moduleAttributeList: Object.keys(mod.attributes),
    };
  });

  const bulkBody = intersperse(importableData, { index: {} });

  try {
    await client.indices.delete({
      index: 'modules',
    });
  } catch (e) {
    // ignore deletion failure
  }

  await client.indices.create({
    index: 'modules',
    include_type_name: false, // TODO: Remove when upgrading to Elasticsearch 7
    body: {
      settings: {
        analysis: {
          analyzer: {
            // An analyzer that produces a level string from a modcode, i.e.
            // "CNS1010SX" => "1000", "CS2030" => "2000", etc.
            level_analyzer: {
              type: 'custom',
              tokenizer: 'first_digit_tokenizer',
              filter: ['first_token_limit_filter', 'thousandizer_filter'],
            },
          },
          tokenizer: { first_digit_tokenizer },
          filter: { first_token_limit_filter, thousandizer_filter },
        },
        index: {
          max_result_window: 20000, // Default limit is 10k, but we have >11k mods
        },
      },
      mappings: {
        properties: {
          workload: { type: 'text' },
          moduleCredit: { type: 'short' },
          moduleCode: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 10,
              },
              level: {
                type: 'text',
                analyzer: 'level_analyzer',
                fielddata: true, // To allow usage in MultiList on the frontend
              },
            },
          },
        },
      },
    },
  });

  client.bulk(
    {
      index: 'modules',
      type: '_doc', // TODO: Remove when upgrading to Elasticsearch 7
      body: bulkBody,
    },
    (err, res) => {
      const { items } = res.body;
      const erroredItems = items.filter((i: any) => i.index.status != 201);
      console.log(`${erroredItems.length} insertion errors of ${res.body.items.length} items.`);
      for (let item of erroredItems) {
        console.log('ERROR importing item', item.index.error);
      }
    },
  );
}
