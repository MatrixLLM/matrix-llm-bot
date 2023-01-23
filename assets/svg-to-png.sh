#!/bin/bash

for svg in ./*.svg;
do 
    inkscape "$(pwd)/${svg}" --export-type=png -h 1080 -o "$(pwd)/$(basename $svg .svg).png"
done