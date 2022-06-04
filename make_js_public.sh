#!/bin/bash

# Usage: bash make_js_public.sh
# requires `typescript` and `prettier`

dir_source="./src_ts_public"
dir_target="./js/public"

script_files=("bindings") # TS files to compile into JS
# script_files=$(ls $dir_source) # <- uncomment to compile all TS files

for script_file in $script_files; do
    echo "$dir_source/$script_file.js"
    tsc "$dir_source/${script_file}.ts" \
        --target esnext \
        --allowJs \
        --outDir ./js/public \
        --strict #\
            # || exit 1
        # --alwaysStrict #\
        # --removeComments \

    # simply remove semicolons from line ends
    sed -i -r 's/;+$//' "$dir_target/${script_file}.js"

    prettier \
        --arrow-parens avoid \
        --single-quote \
        --tab-width=4 \
        --trailing-comma=none \
        --no-semi \
        --no-config \
        --write \
            "$dir_target/${script_file}.js"
done
