export namespace main {
	
	export class MediaFile {
	    path: string;
	    filename: string;
	    size: number;
	    status: string;
	    duration: number;
	    exportPath: string;
	
	    static createFrom(source: any = {}) {
	        return new MediaFile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.filename = source["filename"];
	        this.size = source["size"];
	        this.status = source["status"];
	        this.duration = source["duration"];
	        this.exportPath = source["exportPath"];
	    }
	}

}

