## Setup

1. Run `docker-compose up -d`
2. Run `pnpm i`
3. Use `direnv` to load the `.envrc` file or set the `DATABASE_URL` environment variable in any other way.
4. Run `pnpm seed`
5. Run `pnpm start`

## Customize reporting

- To generate JSON change `MITATA_CONFIG` in `.envrc` to be `json=true`, or `export MITATA_CONFIG='{"avg": true, "json": true, "min_max": true, "collect": true, "percentiles": true}'`.
- To generate CSV from the json, pipe the script json output to `json_to_csv`.
- To visualize the results of the benchmarks, run `./bin/visualize.py`. You need python, numpy, matplotlib, pandas and seaborn installed.
