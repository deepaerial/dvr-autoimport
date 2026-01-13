export namespace main {
	
	export class MediaFile {
	    Path: string;
	    Filename: string;
	    Size: number;
	    Status: string;
	    Duration: string;
	
	    static createFrom(source: any = {}) {
	        return new MediaFile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Path = source["Path"];
	        this.Filename = source["Filename"];
	        this.Size = source["Size"];
	        this.Status = source["Status"];
	        this.Duration = source["Duration"];
	    }
	}

}

