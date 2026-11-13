export interface MemoryNote {id:string;categoryId:string;priority:boolean;title:string;core:string;watch:string;explanation:string;example:string;dialect:string;}
export interface MemoryNotes {
  version:string;title:string;sourceHash:string;editorialNote:string;
  categories:{id:string;title:string;noteIds:string[]}[];
  notes:MemoryNote[];quickLines:{id:string;title:string;text:string}[];
  corrections:{id:string;field:string;before:string;after:string;source:string}[];
}
