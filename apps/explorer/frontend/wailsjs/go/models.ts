export namespace main {
	
	export class CommandShortcut {
	    id: string;
	    label: string;
	    icon: string;
	    command: string;
	    executionMode: string;
	    fixedPath: string;
	    promptEnabled: boolean;
	    promptMessage: string;
	    promptPlaceholder: string;
	
	    static createFrom(source: any = {}) {
	        return new CommandShortcut(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.label = source["label"];
	        this.icon = source["icon"];
	        this.command = source["command"];
	        this.executionMode = source["executionMode"];
	        this.fixedPath = source["fixedPath"];
	        this.promptEnabled = source["promptEnabled"];
	        this.promptMessage = source["promptMessage"];
	        this.promptPlaceholder = source["promptPlaceholder"];
	    }
	}
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
	    favorites: string[];
	    commandShortcuts: CommandShortcut[];
	
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
	        this.favorites = source["favorites"];
	        this.commandShortcuts = this.convertValues(source["commandShortcuts"], CommandShortcut);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

