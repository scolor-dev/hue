export namespace main {
	
	export class FileEntry {
	    name: string;
	    path: string;
	    isDir: boolean;
	    isHidden: boolean;
	    size: number;
	    modTime: string;
	    ext: string;
	
	    static createFrom(source: any = {}) {
	        return new FileEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.isDir = source["isDir"];
	        this.isHidden = source["isHidden"];
	        this.size = source["size"];
	        this.modTime = source["modTime"];
	        this.ext = source["ext"];
	    }
	}
	export class HueSettings {
	    showHidden: boolean;
	    dateFormat: string;
	    previewWidth: number;
	    thumbSize: number;
	    language: string;
	    sortBy: string;
	    sortAsc: boolean;
	    showExtensions: boolean;
	    confirmDelete: boolean;
	
	    static createFrom(source: any = {}) {
	        return new HueSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.showHidden = source["showHidden"];
	        this.dateFormat = source["dateFormat"];
	        this.previewWidth = source["previewWidth"];
	        this.thumbSize = source["thumbSize"];
	        this.language = source["language"];
	        this.sortBy = source["sortBy"];
	        this.sortAsc = source["sortAsc"];
	        this.showExtensions = source["showExtensions"];
	        this.confirmDelete = source["confirmDelete"];
	    }
	}

}

