(function(){
  'use strict';
  const copy={
    en:['Arrange your document','Drag the handle beside a block. Drop toward the right to create a right column, or at the middle left edge to create a left column. Use the remaining upper and lower areas to change the order.','Above','Left column','Right column','Below','Do not show again','Continue','Cancel','Formatting','Expand editor','Restore editor','Apply'],
    'zh-Hant':['調整文件排版','拖動板塊旁的把手。靠右放置可分到右欄；放在中央靠左的窄區域可分到左欄。其餘上方、下方區域可調整順序。','放在上方','左側分欄','右側分欄','放在下方','不再顯示','開始排版','取消','格式','放大編輯視窗','縮回編輯視窗','套用'],
    'zh-Hans':['调整文档排版','拖动文字块旁的手柄。靠右放置可分到右栏；放在中央靠左的窄区域可分到左栏。其余上方、下方区域可调整顺序。','放在上方','左侧分栏','右侧分栏','放在下方','不再显示','开始排版','取消','格式','放大编辑窗口','缩回编辑窗口','应用'],
    ja:['文書のレイアウト','ブロックのハンドルをドラッグします。右寄りに置くと右列、中央の左端に置くと左列になります。それ以外の上下の領域では順序を変更します。','上に配置','左の列','右の列','下に配置','今後表示しない','レイアウトを開始','キャンセル','書式','エディターを拡大','元のサイズに戻す','適用'],
    ko:['문서 배치','블록 옆의 핸들을 드래그하세요. 오른쪽에 놓으면 오른쪽 열, 가운데 왼쪽 가장자리에 놓으면 왼쪽 열을 만듭니다. 나머지 위아래 영역에서는 순서를 바꿉니다.','위에 배치','왼쪽 열','오른쪽 열','아래에 배치','다시 표시하지 않기','배치 시작','취소','서식','편집기 확대','편집기 복원','적용'],
    es:['Organizar el documento','Arrastra el tirador del bloque. Hacia la derecha crea una columna derecha; en el borde izquierdo del centro crea una columna izquierda. Las demás zonas superiores e inferiores cambian el orden.','Arriba','Columna izquierda','Columna derecha','Abajo','No volver a mostrar','Continuar','Cancelar','Formato','Ampliar editor','Restaurar editor','Aplicar'],
    fr:['Organiser le document','Faites glisser la poignée du bloc. Vers la droite, créez une colonne à droite ; au bord gauche central, créez une colonne à gauche. Les autres zones du haut et du bas changent l’ordre.','Au-dessus','Colonne gauche','Colonne droite','En dessous','Ne plus afficher','Continuer','Annuler','Format','Agrandir l’éditeur','Rétablir l’éditeur','Appliquer'],
    de:['Dokument anordnen','Ziehe den Block am Griff. Rechts entsteht eine rechte Spalte, am linken Rand in der Mitte eine linke Spalte. Die übrigen oberen und unteren Bereiche ändern die Reihenfolge.','Darüber','Linke Spalte','Rechte Spalte','Darunter','Nicht mehr anzeigen','Weiter','Abbrechen','Format','Editor vergrößern','Editor zurücksetzen','Anwenden'],
    'pt-BR':['Organizar o documento','Arraste a alça do bloco. À direita cria uma coluna direita; na borda esquerda central cria uma coluna esquerda. As demais áreas superiores e inferiores mudam a ordem.','Acima','Coluna esquerda','Coluna direita','Abaixo','Não mostrar novamente','Continuar','Cancelar','Formato','Expandir editor','Restaurar editor','Aplicar'],
    ru:['Разместить текст','Перетащите блок за ручку. Справа создаётся правый столбец, у левого края посередине — левый. Остальные верхние и нижние области меняют порядок.','Сверху','Левый столбец','Правый столбец','Снизу','Больше не показывать','Продолжить','Отмена','Формат','Развернуть редактор','Восстановить редактор','Применить'],
    it:['Disporre il documento','Trascina la maniglia del blocco. Verso destra crea una colonna a destra; sul bordo sinistro centrale crea una colonna a sinistra. Le altre aree superiori e inferiori cambiano l’ordine.','Sopra','Colonna sinistra','Colonna destra','Sotto','Non mostrare più','Continua','Annulla','Formato','Espandi editor','Ripristina editor','Applica']
  };
  const formats={
    en:['Paragraph','Title','Heading','Subheading','Bold','Italic','Strikethrough','Bullets','Numbered list','Quote','Undo','Redo'],
    'zh-Hant':['內文','大標題','段落標題','小標題','粗體','斜體','刪除線','項目符號','編號清單','引述段落','復原','重做'],
    'zh-Hans':['正文','大标题','段落标题','小标题','粗体','斜体','删除线','项目符号','编号列表','引用段落','撤销','重做'],
    ja:['本文','タイトル','見出し','小見出し','太字','斜体','取り消し線','箇条書き','番号付きリスト','引用','元に戻す','やり直す'],
    ko:['본문','제목','머리글','부제목','굵게','기울임','취소선','글머리 기호','번호 목록','인용','실행 취소','다시 실행'],
    es:['Párrafo','Título','Encabezado','Subtítulo','Negrita','Cursiva','Tachado','Viñetas','Lista numerada','Cita','Deshacer','Rehacer'],
    fr:['Paragraphe','Titre','Titre de section','Sous-titre','Gras','Italique','Barré','Puces','Liste numérotée','Citation','Annuler','Rétablir'],
    de:['Absatz','Titel','Überschrift','Untertitel','Fett','Kursiv','Durchgestrichen','Aufzählung','Nummerierte Liste','Zitat','Rückgängig','Wiederholen'],
    'pt-BR':['Parágrafo','Título','Cabeçalho','Subtítulo','Negrito','Itálico','Tachado','Marcadores','Lista numerada','Citação','Desfazer','Refazer'],
    ru:['Абзац','Заголовок','Раздел','Подзаголовок','Жирный','Курсив','Зачёркнутый','Маркеры','Нумерация','Цитата','Отменить','Повторить'],
    it:['Paragrafo','Titolo','Intestazione','Sottotitolo','Grassetto','Corsivo','Barrato','Elenco puntato','Elenco numerato','Citazione','Annulla','Ripeti']
  };
  const commands=['paragraph','heading-1','heading-2','heading-3','bold','italic','strike','bullet-list','ordered-list','quote','undo','redo'];
  function localize({language,dialog,help}){
    const c=copy[language]||copy.en,f=formats[language]||formats.en;
    const set=(root,selector,text)=>{const el=root?.querySelector(selector);if(el)el.textContent=text;};
    set(help,'#report-help-title',c[0]);set(help,'#report-help-copy',c[1]+(language==='zh-Hant'?' 按住 Shift 點選可連選多個板塊，一起拖動。':language==='zh-Hans'?' 按住 Shift 点击可连续选择多个文字块并一起拖动。':language==='en'?' Shift-click to select consecutive blocks and drag them together.':''));
    ['above','left','right','below'].forEach((zone,i)=>set(help,`[data-help-zone="${zone}"]`,c[i+2]));
    set(help,'#report-help-hide-label',c[6]);set(help,'#report-help-continue',({en:'Got it','zh-Hant':'知道了','zh-Hans':'知道了',ja:'閉じる',ko:'확인',es:'Entendido',fr:'Compris',de:'Verstanden','pt-BR':'Entendi',ru:'Понятно',it:'Capito'}[language]||'Got it'));set(help,'#report-help-cancel',c[8]);
    set(dialog,'header strong',c[9]);set(dialog,'#report-content-cancel',c[8]);set(dialog,'#report-content-apply',c[12]);
    const bar=dialog?.querySelector('.report-content-toolbar');bar?.setAttribute('aria-label',c[9]);
    commands.forEach((command,i)=>set(dialog,`[data-report-command="${command}"]`,f[i]));
    const expanded=dialog?.classList.contains('is-expanded'),button=dialog?.querySelector('#report-content-expand');
    if(button){button.textContent=expanded?'❐':'⛶';button.title=c[expanded?11:10];button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(expanded));}
  }
  function formatToolbar(dialog,editor,language){
    const bar=dialog.querySelector('.report-content-toolbar');bar.replaceChildren();
    for(const command of commands){const button=document.createElement('button');button.type='button';button.dataset.reportCommand=command;button.onpointerdown=e=>e.preventDefault();button.onclick=()=>editor.command(command);bar.append(button);}
    localize({language,dialog});
  }
  function helpBanner(language,onDismiss){
    const help=document.createElement('section');help.id='report-help-banner';help.className='report-help-banner';help.setAttribute('role','note');
    help.innerHTML='<div><strong id="report-help-title"></strong><p id="report-help-copy"></p></div><footer><label><input id="report-help-hide" type="checkbox"><span id="report-help-hide-label"></span></label><button id="report-help-continue" type="button"></button></footer>';
    help.querySelector('button').onclick=()=>{onDismiss?.(help.querySelector('input').checked);help.hidden=true;};localize({language,help});return help;
  }
  const deletionCopy={
    en:['Delete this column?','Delete the selected content?','Remove {n} text blocks from the layout. Deleting in layout mode does not affect the original Markdown (.md) file.','Cancel','Confirm deletion'],
    'zh-Hant':['刪除此欄的內容？','刪除選取的內容？','將從排版稿移除 {n} 個文字板塊。排版編輯模式的刪除不會影響原始 Markdown（.md）檔案。','取消','確認刪除'],
    'zh-Hans':['删除此栏的内容？','删除选中的内容？','将从排版稿移除 {n} 个文字块。排版编辑模式的删除不会影响原始 Markdown（.md）文件。','取消','确认删除'],
    ja:['この列を削除しますか？','選択した内容を削除しますか？','レイアウトから {n} 個のテキストブロックを削除します。元の Markdown（.md）ファイルには影響しません。','キャンセル','削除を確認'],
    ko:['이 열을 삭제할까요?','선택한 내용을 삭제할까요?','배치에서 텍스트 블록 {n}개를 제거합니다. 원본 Markdown(.md) 파일에는 영향을 주지 않습니다.','취소','삭제 확인'],
    es:['¿Eliminar esta columna?','¿Eliminar el contenido seleccionado?','Se eliminarán {n} bloques del diseño. El archivo Markdown (.md) original no se modifica.','Cancelar','Confirmar eliminación'],
    fr:['Supprimer cette colonne ?','Supprimer le contenu sélectionné ?','Retirer {n} blocs de la mise en page. Le fichier Markdown (.md) original reste inchangé.','Annuler','Confirmer la suppression'],
    de:['Diese Spalte löschen?','Ausgewählten Inhalt löschen?','{n} Textblöcke aus dem Layout entfernen. Die ursprüngliche Markdown-Datei (.md) bleibt unverändert.','Abbrechen','Löschen bestätigen'],
    'pt-BR':['Excluir esta coluna?','Excluir o conteúdo selecionado?','Remover {n} blocos do layout. O arquivo Markdown (.md) original não será alterado.','Cancelar','Confirmar exclusão'],
    ru:['Удалить этот столбец?','Удалить выбранное содержимое?','Из макета будут удалены блоки: {n}. Исходный файл Markdown (.md) не изменится.','Отмена','Подтвердить удаление'],
    it:['Eliminare questa colonna?','Eliminare il contenuto selezionato?','Rimuovere {n} blocchi dal layout. Il file Markdown (.md) originale rimane invariato.','Annulla','Conferma eliminazione']
  };
  function confirmDeletion(language,count,column){
    const dialog=document.createElement('dialog');dialog.className='report-delete-dialog';dialog.setAttribute('aria-labelledby','report-delete-title');dialog.setAttribute('aria-describedby','report-delete-copy');
    dialog.innerHTML='<h3 id="report-delete-title"></h3><p id="report-delete-copy"></p><label class="report-dismiss"><input type="checkbox" data-delete-hide><span data-delete-hide-label></span></label><footer><button type="button" data-delete-cancel></button><button type="button" data-delete-confirm></button></footer>';
    const cancel=dialog.querySelector('[data-delete-cancel]'),confirm=dialog.querySelector('[data-delete-confirm]');
    const setLanguage=lang=>{const c=deletionCopy[lang]||deletionCopy.en;dialog.querySelector('h3').textContent=c[column?0:1];dialog.querySelector('p').textContent=c[2].replace('{n}',String(count));cancel.textContent=c[3];confirm.textContent=c[4];dialog.querySelector("[data-delete-hide-label]").textContent=(copy[lang]||copy.en)[6];};setLanguage(language);document.body.append(dialog);
    const result=new Promise(resolve=>dialog.addEventListener('close',()=>{const accepted=dialog.returnValue==='delete';dialog.remove();resolve(accepted);},{once:true}));cancel.onclick=()=>dialog.close('cancel');confirm.onclick=()=>dialog.close('delete');dialog.showModal();cancel.focus();
    return{result,setLanguage,get suppress(){return dialog.querySelector("[data-delete-hide]").checked;},destroy:()=>{if(dialog.open)dialog.close('cancel');else dialog.remove();}};
  }
  const modeCopy={en:['Save layout changes?','Save changes to the PDF layout before changing editing modes?','Save and switch','Discard and switch'], 'zh-Hant':['儲存排版變更？','切換編輯模式前，要儲存目前的 PDF 排版變更嗎？','儲存並切換','不儲存，切換'], 'zh-Hans':['保存排版更改？','切换编辑模式前，要保存当前 PDF 排版更改吗？','保存并切换','不保存，切换'],ja:['レイアウトを保存しますか？','編集モードを変更する前に PDF レイアウトの変更を保存しますか？','保存して切り替え','保存せず切り替え'],ko:['배치 변경을 저장할까요?','편집 모드를 바꾸기 전에 PDF 배치를 저장할까요?','저장 후 전환','저장하지 않고 전환'],es:['¿Guardar el diseño?','¿Guardar los cambios del diseño PDF antes de cambiar de modo?','Guardar y cambiar','Descartar y cambiar'],fr:['Enregistrer la mise en page ?','Enregistrer les modifications PDF avant de changer de mode ?','Enregistrer et changer','Abandonner et changer'],de:['Layout speichern?','PDF-Layout vor dem Moduswechsel speichern?','Speichern und wechseln','Verwerfen und wechseln'],'pt-BR':['Salvar o layout?','Salvar as alterações do PDF antes de mudar de modo?','Salvar e mudar','Descartar e mudar'],ru:['Сохранить макет?','Сохранить изменения PDF перед сменой режима?','Сохранить и перейти','Отменить и перейти'],it:['Salvare il layout?','Salvare le modifiche PDF prima di cambiare modalità?','Salva e cambia','Scarta e cambia']};
  function confirmModeChange(language){
    const dialog=document.createElement('dialog');dialog.className='report-delete-dialog report-mode-dialog';dialog.setAttribute('aria-labelledby','report-mode-title');dialog.innerHTML='<h3 id="report-mode-title"></h3><p></p><footer><button data-mode-cancel></button><button data-mode-discard></button><button data-mode-save></button></footer>';
    const c=modeCopy[language]||modeCopy.en;dialog.querySelector('h3').textContent=c[0];dialog.querySelector('p').textContent=c[1];dialog.querySelector('[data-mode-cancel]').textContent=(copy[language]||copy.en)[8];dialog.querySelector('[data-mode-discard]').textContent=c[3];dialog.querySelector('[data-mode-save]').textContent=c[2];document.body.append(dialog);
    const result=new Promise(resolve=>dialog.addEventListener('close',()=>{const choice=['save','discard'].includes(dialog.returnValue)?dialog.returnValue:'cancel';dialog.remove();resolve(choice);},{once:true}));for(const action of ['cancel','discard','save'])dialog.querySelector('[data-mode-'+action+']').onclick=()=>dialog.close(action);dialog.showModal();dialog.querySelector('[data-mode-cancel]').focus();return{result};
  }
  window.LumaReportUI={localize,formatToolbar,helpBanner,confirmDeletion,confirmModeChange};
})();
