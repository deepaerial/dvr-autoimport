# dvr-autoimport
Export all  DVR footage recorded by DJI Goggles onto microSD card to a specified folder.
Script copies all `mp4` and `srt` files to the folder specified by `DVR_EXPORT_PATH` environmental variable.

> **Important** This script only works on Mac OS based machines.

## Launch script from terminal
1. Set "DVR_EXPORT_PATH" environmental variable:
```
export DVR_EXPORT_PATH=~/Nextcloud/FPV/Videos  
```
2. Launch `DVRImporter.applescript` script file:
```
osascript DVRImporter.applescript
```
After launching script Finder will ask you to choose volume where DVR footage is, find your SD Card and click "Export".  