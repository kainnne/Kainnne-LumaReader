import {EditorState,Compartment} from '@codemirror/state';
import {EditorView,ViewPlugin,Decoration,keymap,lineNumbers,highlightActiveLineGutter,highlightSpecialChars,drawSelection,highlightActiveLine} from '@codemirror/view';
import {history,historyKeymap,defaultKeymap,indentWithTab} from '@codemirror/commands';
import {syntaxHighlighting,HighlightStyle,bracketMatching,indentUnit} from '@codemirror/language';
import {tags} from '@lezer/highlight';
import {python} from '@codemirror/lang-python';
import {cpp} from '@codemirror/lang-cpp';
import {javascript} from '@codemirror/lang-javascript';
const languages={'.py':()=>python(),'.c':()=>cpp(),'.h':()=>cpp(),'.cpp':()=>cpp(),'.hpp':()=>cpp(),'.js':()=>javascript(),'.ts':()=>javascript({typescript:true})};
const names={'.py':'Python','.c':'C','.h':'C','.cpp':'C++','.hpp':'C++','.js':'JavaScript','.ts':'TypeScript'};
const colors=HighlightStyle.define([
 {tag:[tags.keyword,tags.operatorKeyword],color:'var(--syntax-keyword)'},
 {tag:[tags.string,tags.special(tags.string)],color:'var(--syntax-string)'},
 {tag:[tags.number,tags.bool,tags.null],color:'var(--syntax-number)'},
 {tag:[tags.comment],color:'var(--syntax-comment)',fontStyle:'italic'},
 {tag:[tags.function(tags.variableName),tags.typeName,tags.className,tags.definition(tags.variableName)],color:'var(--syntax-function)'},
 {tag:tags.operator,color:'var(--syntax-keyword)'}
]);
// Decorate only visible leading whitespace; the underlying document is unchanged.
const indentation=ViewPlugin.fromClass(class{
 constructor(view){this.decorations=this.build(view);}
 update(update){if(update.docChanged||update.viewportChanged)this.decorations=this.build(update.view);}
 build(view){const ranges=[],seen=new Set();for(const {from,to}of view.visibleRanges){let line=view.state.doc.lineAt(from);while(line.from<=to){if(!seen.has(line.from)){seen.add(line.from);const lead=/^[ \t]+/.exec(line.text);if(lead)ranges.push(Decoration.mark({class:'cm-code-indent'}).range(line.from,line.from+lead[0].length));}if(line.to>=view.state.doc.length)break;line=view.state.doc.lineAt(line.to+1);}}return Decoration.set(ranges.sort((a,b)=>a.from-b.from));}
},{decorations:v=>v.decorations});
class CodeAdapter {
 constructor(){this.editability=new Compartment();this.currentPage=1;this.editable=false;}
 async loadDocument(source){this.document=source;this.text=String(source.text||'');this.bom=this.text.startsWith('\ufeff')?'\ufeff':'';this.extension=source.extension||/\.[^.]+$/.exec(source.name||source.path)?.[0]||'.txt';this.large=this.text.length>200000;return source;}
 makeState(text){this.lineSeparator=text.includes('\r\n')?'\r\n':'\n';return EditorState.create({doc:this.bom&&text.startsWith(this.bom)?text.slice(1):text,extensions:[
  EditorState.lineSeparator.of(this.lineSeparator),EditorState.tabSize.of(4),indentation,lineNumbers(),highlightActiveLineGutter(),highlightSpecialChars(),drawSelection(),history(),bracketMatching(),indentUnit.of('    '),
  keymap.of([...defaultKeymap,...historyKeymap,indentWithTab]),syntaxHighlighting(colors),this.large?[]:(languages[this.extension]?.()||[]),
  this.editability.of([EditorState.readOnly.of(!this.editable),EditorView.editable.of(this.editable)]),
  EditorView.contentAttributes.of({'aria-label':'Code editor',spellcheck:'false'}),EditorView.updateListener.of(update=>{if(update.docChanged)this.context.onEdit?.(this.bom+update.state.sliceDoc());}),
  EditorView.theme({'&':{height:'100%',color:'var(--ink)',backgroundColor:'var(--paper)',fontSize:'var(--reader-size)'},'.cm-scroller':{fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',lineHeight:'1.8',overflow:'auto'},'.cm-content':{padding:'18px 0'},'.cm-code-indent':{letterSpacing:'.12em',backgroundImage:'repeating-linear-gradient(to right, transparent 0, transparent calc(2.88em - 1px), color-mix(in srgb, var(--muted) 16%, transparent) calc(2.88em - 1px), color-mix(in srgb, var(--muted) 16%, transparent) 2.88em)'},'.cm-line':{padding:'0 20px'},'.cm-gutters':{backgroundColor:'var(--paper)',color:'var(--muted)',borderRight:'1px solid var(--line)'},'.cm-activeLineGutter':{backgroundColor:'var(--code)'},'&.cm-focused':{outline:'none'},'.cm-cursor':{borderLeftColor:'var(--ink)'},'.cm-selectionBackground, &.cm-focused .cm-selectionBackground':{backgroundColor:'var(--code-selection)'}})
 ]});}
 async renderDocument(container,context={}){this.context=context;container.replaceChildren();const shell=document.createElement('section');shell.className='code-document';const header=document.createElement('header');header.className='code-document-header';const label=document.createElement('span');label.textContent=names[this.extension]||'Code';const status=document.createElement('span');this.status=status;header.append(label,status);const mount=document.createElement('div');mount.id='code-editor';shell.append(header,mount);container.append(shell);this.view=new EditorView({state:this.makeState(this.text),parent:mount});this.updateStatus();return shell;}
 setLanguage(language){this.context.language=language;this.updateStatus();}
 updateStatus(){const zh=this.context.language?.startsWith('zh');this.status.textContent=(this.editable?(zh?'可編輯':'Editing'):(zh?'唯讀':'Read only'))+(this.large?(zh?' · 大型檔案暫停語法上色':' · Highlighting paused for large file'):'');}
 setEditable(value){if(this.editable===value)return;this.editable=value;this.view?.dispatch({effects:this.editability.reconfigure([EditorState.readOnly.of(!value),EditorView.editable.of(value)])});this.updateStatus();}
 setText(text){this.text=text;this.view?.setState(this.makeState(text));}
 getText(){return this.bom+this.view.state.sliceDoc();}
 focus(){this.view.focus();}
 supportsPagedMode(){return false;}
 getPageCount(){return 1;}
 dispose(){this.view?.destroy();}
}
export function createAdapter(){return new CodeAdapter();}
