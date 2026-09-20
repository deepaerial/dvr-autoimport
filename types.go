package main

type MediaFile struct {
	Path       string `json:"path"`
	Filename   string `json:"filename"`
	Size       int64  `json:"size"`
	Status     string `json:"status"`
	Duration   uint64 `json:"duration"`
	ExportPath string `json:"exportPath"`
}
