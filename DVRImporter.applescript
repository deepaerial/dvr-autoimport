set envVarName to "DVR_EXPORT_PATH"
set exportPath to do shell script "echo $" & envVarName

tell application "Finder"
    set mountedVolumes to name of every disk
    set chosenVolume to choose from list mountedVolumes with prompt "Select a volume to export:" OK button name "Export" cancel button name "Cancel"

    if chosenVolume is false then
        return
    end if

    set volumePath to "/Volumes/" & chosenVolume as string
    set mediaFolderPath to volumePath & "/DCIM/100MEDIA"

    if not (exists folder mediaFolderPath) then
        display dialog mediaFolderPath & " folder not found in the selected " & volumePath & " volume." buttons {"OK"} default button 1
        return
    end if

    set mp4Files to (files of folder mediaFolderPath whose name extension is "mp4")

    if (count of mp4Files) is 0 then
        display dialog "No MP4 files found in the DCIM/100MEDIA folder." buttons {"OK"} default button 1
        return
    end if

    repeat with aFile in mp4Files
        set fileCreationDate to creation date of aFile
        set folderDate to year of fileCreationDate & "-" & my zeroPad(month of fileCreationDate as integer) & "-" & my zeroPad(day of fileCreationDate)
        set destFolder to POSIX file (exportPath & "/" & folderDate) as alias

        if not (exists destFolder) then
            make new folder at POSIX file exportPath with properties {name:folderDate}
        end if

        duplicate aFile to destFolder with replacing
    end repeat
end tell

to zeroPad(n)
    if n < 10 then
        return "0" & n
    else
        return n
    end if
end zeroPad
