#! /bin/bash
declare -a VOLUMES_TO_IGNORE=(
    Macintosh HD
    NO NAME
) 
SD_CARD_VOLUMES=$(find /Volumes/ -type d -maxdepth 1 -name "*" $(printf " -not -name %s" "${VOLUMES_TO_IGNORE[@]}"))

echo $SD_CARD_VOLUMES