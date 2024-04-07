#!/usr/bin/osascript
set envVarName to "DVR_EXPORT_PATH"
set exportPath to do shell script "echo $" & envVarName

tell application "Finder"
    set mountedVolumes to name of every disk
    set chosenVolume to choose from list mountedVolumes with prompt "Select a volume to export:" OK button name "Export" cancel button name "Cancel" with title "DVR Export"

    if chosenVolume is false then
        return
    end if

    set volumePath to (chosenVolume as string) & ":"
    set mediaFolderPath to volumePath & "DCIM:100MEDIA"

    if not (exists folder mediaFolderPath) then
        display dialog "DCIM/100MEDIA folder not found in " & chosenVolume & "." buttons {"OK"} default button 1  
        return
    end if

    set mediaFiles to (files of folder mediaFolderPath whose (name extension is "mp4" or name extension is "srt" or name extension is "mov"))

    if (count of mediaFiles) is 0 then
        display dialog "No MP4 or SRT files found in the DCIM/100MEDIA folder." buttons {"OK"} default button 1 with title "DVR Export: Error"
        return
    end if

    set exportedFiles to {}
    repeat with aFile in mediaFiles
        set fileCreationDate to creation date of aFile
        set folderDate to year of fileCreationDate & "-" & my zeroPad(month of fileCreationDate as integer) & "-" & my zeroPad(day of fileCreationDate)
        set destFolderPath to exportPath & "/" & folderDate & "/"

        tell application "System Events"
            if not (exists folder destFolderPath) then
                do shell script "mkdir -p " & quoted form of destFolderPath
            end if
        end tell

        set destFolder to POSIX file destFolderPath as alias
        duplicate aFile to destFolder with replacing
        set end of exportedFiles to name of aFile & " to " & folderDate
    end repeat

    set numberOfExportedFiles to count of exportedFiles
    if (numberOfExportedFiles) > 0 then
        set exportedFilesText to "Exported Files(" & numberOfExportedFiles & "):" & return & return & (my listToString(exportedFiles, return))
        display dialog exportedFilesText buttons {"OK"} default button 1 with title "DVR Export: Summary"
    else
        display dialog "No files were exported." buttons {"OK"} default button 1 with title "DVR Export: Summary"
    end if
end tell

to zeroPad(n)
    if n < 10 then
        return "0" & n
    else
        return n
    end if
end zeroPad

to listToString(theList, theDelimiter)
    set oldDelimiters to AppleScript's text item delimiters
    set AppleScript's text item delimiters to theDelimiter
    set theString to theList as string
    set AppleScript's text item delimiters to oldDelimiters
    return theString
end listToString
