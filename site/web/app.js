(function () {
  "use strict";

  const MARKDOWN_EXTENSIONS = [".md", ".mkd", ".mdx", ".markdown"];
  const SUPPORTED_EXTENSIONS = [...MARKDOWN_EXTENSIONS, ".txt", ".log"];
  const SUPPORTED_EXTENSION_SET = new Set(SUPPORTED_EXTENSIONS);
  const translations = {
    en: { library:"Document Library",sourcePlaceholder:"Paste file://, http:// or https://",openSource:"Open source",chooseFile:"Choose local document",search:"Search documents",rescan:"Rescan",navigation:"Navigation",files:"Files",outline:"Current File Outline",documents:"Documents",ready:"Ready",readerSettings:"Reader settings",readingMode:"Reading mode",vertical:"Vertical",horizontal:"Horizontal",paged:"Paged",pagedHorizontal:"Paged · Left / right",pagedVertical:"Paged · Up / down",pageNavigation:"Page navigation",previousPage:"Previous page",nextPage:"Next page",source:"Source",media:"Media",smallerText:"Smaller text",largerText:"Larger text",palette:"Color palette",language:"Interface language",darkMode:"Dark mode",lightMode:"Light mode",fullscreen:"Fullscreen",empty:"Choose a main folder as the root of your preview library.",mediaPreview:"Media Preview",close:"Close",live:"Live",loading:"Loading…",loadError:"Unable to open this document.",refreshed:"Document refreshed",renderedView:"Rendered view",sourceView:"Source view",noOutline:"No headings in this document.",noMedia:"No media in this document.",copy:"Copy",copied:"Copied",invalidSource:"Enter a file://, http://, https:// or local path.",noMatches:"No matching documents." },
    "zh-Hant": { library:"文件資料庫",sourcePlaceholder:"貼上 file://、http:// 或 https://",openSource:"開啟來源",chooseFile:"選擇本機文件",search:"搜尋文件",rescan:"重新掃描",navigation:"導覽",files:"檔案",outline:"當前檔案目錄",documents:"文件",ready:"準備完成",readerSettings:"閱讀設定",readingMode:"閱讀模式",vertical:"直式",horizontal:"橫式",paged:"翻頁",pagedHorizontal:"翻頁・左右",pagedVertical:"翻頁・上下",pageNavigation:"翻頁導覽",previousPage:"上一頁",nextPage:"下一頁",source:"原文",media:"媒體",smallerText:"縮小文字",largerText:"放大文字",palette:"色系",language:"介面語言",darkMode:"深色模式",lightMode:"明亮模式",fullscreen:"全螢幕",empty:"選擇一個主資料夾作為根目錄進行預覽。",mediaPreview:"媒體預覽",close:"關閉",live:"即時",loading:"載入中…",loadError:"無法開啟這份文件。",refreshed:"文件已更新",renderedView:"閱讀畫面",sourceView:"原始內容",noOutline:"這份文件沒有標題目錄。",noMedia:"這份文件沒有媒體。",copy:"複製",copied:"已複製",invalidSource:"請輸入 file://、http://、https:// 或本機路徑。",noMatches:"找不到符合的文件。" },
    "zh-Hans": { library:"文档资料库",sourcePlaceholder:"粘贴 file://、http:// 或 https://",openSource:"打开来源",chooseFile:"选择本地文档",search:"搜索文档",rescan:"重新扫描",navigation:"导航",files:"文件",outline:"当前文件目录",documents:"文档",ready:"准备完成",readerSettings:"阅读设置",readingMode:"阅读模式",vertical:"纵向",horizontal:"横向",paged:"翻页",pagedHorizontal:"翻页・左右",pagedVertical:"翻页・上下",pageNavigation:"翻页导航",previousPage:"上一页",nextPage:"下一页",source:"原文",media:"媒体",smallerText:"缩小文字",largerText:"放大文字",palette:"配色",language:"界面语言",darkMode:"深色模式",lightMode:"浅色模式",fullscreen:"全屏",empty:"选择一个主文件夹作为根目录进行预览。",mediaPreview:"媒体预览",close:"关闭",live:"实时",loading:"加载中…",loadError:"无法打开此文档。",refreshed:"文档已更新",renderedView:"阅读视图",sourceView:"原始内容",noOutline:"此文档没有标题目录。",noMedia:"此文档没有媒体。",copy:"复制",copied:"已复制",invalidSource:"请输入 file://、http://、https:// 或本地路径。",noMatches:"没有匹配的文档。" },
    ja: { library:"ドキュメントライブラリ",sourcePlaceholder:"file://、http://、https:// を貼り付け",openSource:"ソースを開く",chooseFile:"ローカル文書を選択",search:"文書を検索",rescan:"再スキャン",navigation:"ナビゲーション",files:"ファイル",outline:"目次",documents:"文書",ready:"準備完了",readerSettings:"閲覧設定",readingMode:"閲覧モード",vertical:"縦書き表示",horizontal:"横スクロール",paged:"ページ",source:"ソース",media:"メディア",smallerText:"文字を小さく",largerText:"文字を大きく",palette:"カラーテーマ",language:"表示言語",darkMode:"ダークモード",lightMode:"ライトモード",fullscreen:"全画面",empty:"文書を選択してください。",mediaPreview:"メディアプレビュー",close:"閉じる",live:"ライブ",loading:"読み込み中…",loadError:"文書を開けません。",refreshed:"文書を更新しました",renderedView:"プレビュー",sourceView:"ソース表示",noOutline:"見出しがありません。",noMedia:"メディアがありません。",copy:"コピー",copied:"コピーしました",invalidSource:"有効な URL またはローカルパスを入力してください。",noMatches:"一致する文書がありません。" },
    ko: { library:"문서 라이브러리",sourcePlaceholder:"file://, http:// 또는 https:// 붙여넣기",openSource:"소스 열기",chooseFile:"로컬 문서 선택",search:"문서 검색",rescan:"다시 검색",navigation:"탐색",files:"파일",outline:"목차",documents:"문서",ready:"준비됨",readerSettings:"읽기 설정",readingMode:"읽기 모드",vertical:"세로",horizontal:"가로",paged:"페이지",source:"원문",media:"미디어",smallerText:"글자 축소",largerText:"글자 확대",palette:"색상 테마",language:"인터페이스 언어",darkMode:"다크 모드",lightMode:"라이트 모드",fullscreen:"전체 화면",empty:"문서를 선택해 읽기를 시작하세요.",mediaPreview:"미디어 미리보기",close:"닫기",live:"실시간",loading:"불러오는 중…",loadError:"문서를 열 수 없습니다.",refreshed:"문서가 업데이트되었습니다",renderedView:"읽기 화면",sourceView:"원문 보기",noOutline:"제목 목차가 없습니다.",noMedia:"미디어가 없습니다.",copy:"복사",copied:"복사됨",invalidSource:"유효한 URL 또는 로컬 경로를 입력하세요.",noMatches:"일치하는 문서가 없습니다." },
    es: { library:"Biblioteca de documentos",sourcePlaceholder:"Pega file://, http:// o https://",openSource:"Abrir origen",chooseFile:"Elegir documento local",search:"Buscar documentos",rescan:"Volver a analizar",navigation:"Navegación",files:"Archivos",outline:"Índice",documents:"Documentos",ready:"Listo",readerSettings:"Ajustes de lectura",readingMode:"Modo de lectura",vertical:"Vertical",horizontal:"Horizontal",paged:"Páginas",source:"Fuente",media:"Medios",smallerText:"Texto más pequeño",largerText:"Texto más grande",palette:"Paleta de colores",language:"Idioma",darkMode:"Modo oscuro",lightMode:"Modo claro",fullscreen:"Pantalla completa",empty:"Elige un documento para comenzar.",mediaPreview:"Vista multimedia",close:"Cerrar",live:"En vivo",loading:"Cargando…",loadError:"No se puede abrir el documento.",refreshed:"Documento actualizado",renderedView:"Vista renderizada",sourceView:"Código fuente",noOutline:"No hay encabezados.",noMedia:"No hay contenido multimedia.",copy:"Copiar",copied:"Copiado",invalidSource:"Introduce una URL o ruta local válida.",noMatches:"No hay documentos coincidentes." },
    fr: { library:"Bibliothèque de documents",sourcePlaceholder:"Collez file://, http:// ou https://",openSource:"Ouvrir la source",chooseFile:"Choisir un document local",search:"Rechercher",rescan:"Réanalyser",navigation:"Navigation",files:"Fichiers",outline:"Plan",documents:"Documents",ready:"Prêt",readerSettings:"Réglages de lecture",readingMode:"Mode de lecture",vertical:"Vertical",horizontal:"Horizontal",paged:"Pages",source:"Source",media:"Médias",smallerText:"Réduire le texte",largerText:"Agrandir le texte",palette:"Palette",language:"Langue",darkMode:"Mode sombre",lightMode:"Mode clair",fullscreen:"Plein écran",empty:"Choisissez un document pour commencer.",mediaPreview:"Aperçu des médias",close:"Fermer",live:"Direct",loading:"Chargement…",loadError:"Impossible d’ouvrir ce document.",refreshed:"Document actualisé",renderedView:"Aperçu",sourceView:"Code source",noOutline:"Aucun titre dans ce document.",noMedia:"Aucun média dans ce document.",copy:"Copier",copied:"Copié",invalidSource:"Saisissez une URL ou un chemin local valide.",noMatches:"Aucun document correspondant." },
    de: { library:"Dokumentbibliothek",sourcePlaceholder:"file://, http:// oder https:// einfügen",openSource:"Quelle öffnen",chooseFile:"Lokales Dokument wählen",search:"Dokumente suchen",rescan:"Neu einlesen",navigation:"Navigation",files:"Dateien",outline:"Gliederung",documents:"Dokumente",ready:"Bereit",readerSettings:"Leseeinstellungen",readingMode:"Lesemodus",vertical:"Vertikal",horizontal:"Horizontal",paged:"Seiten",source:"Quelltext",media:"Medien",smallerText:"Text verkleinern",largerText:"Text vergrößern",palette:"Farbpalette",language:"Sprache",darkMode:"Dunkelmodus",lightMode:"Hellmodus",fullscreen:"Vollbild",empty:"Wähle ein Dokument aus.",mediaPreview:"Medienvorschau",close:"Schließen",live:"Live",loading:"Wird geladen…",loadError:"Dokument kann nicht geöffnet werden.",refreshed:"Dokument aktualisiert",renderedView:"Vorschau",sourceView:"Quelltextansicht",noOutline:"Keine Überschriften vorhanden.",noMedia:"Keine Medien vorhanden.",copy:"Kopieren",copied:"Kopiert",invalidSource:"Gib eine gültige URL oder einen lokalen Pfad ein.",noMatches:"Keine passenden Dokumente." },
    "pt-BR": { library:"Biblioteca de documentos",sourcePlaceholder:"Cole file://, http:// ou https://",openSource:"Abrir origem",chooseFile:"Escolher documento local",search:"Buscar documentos",rescan:"Verificar novamente",navigation:"Navegação",files:"Arquivos",outline:"Sumário",documents:"Documentos",ready:"Pronto",readerSettings:"Configurações de leitura",readingMode:"Modo de leitura",vertical:"Vertical",horizontal:"Horizontal",paged:"Páginas",source:"Fonte",media:"Mídia",smallerText:"Texto menor",largerText:"Texto maior",palette:"Paleta de cores",language:"Idioma",darkMode:"Modo escuro",lightMode:"Modo claro",fullscreen:"Tela cheia",empty:"Escolha um documento para começar.",mediaPreview:"Prévia de mídia",close:"Fechar",live:"Ao vivo",loading:"Carregando…",loadError:"Não foi possível abrir o documento.",refreshed:"Documento atualizado",renderedView:"Visualização",sourceView:"Código-fonte",noOutline:"Nenhum título encontrado.",noMedia:"Nenhuma mídia encontrada.",copy:"Copiar",copied:"Copiado",invalidSource:"Digite uma URL ou caminho local válido.",noMatches:"Nenhum documento correspondente." },
    ru: { library:"Библиотека документов",sourcePlaceholder:"Вставьте file://, http:// или https://",openSource:"Открыть источник",chooseFile:"Выбрать локальный документ",search:"Поиск документов",rescan:"Обновить список",navigation:"Навигация",files:"Файлы",outline:"Содержание",documents:"Документы",ready:"Готово",readerSettings:"Настройки чтения",readingMode:"Режим чтения",vertical:"Вертикально",horizontal:"Горизонтально",paged:"Страницы",source:"Исходник",media:"Медиа",smallerText:"Уменьшить текст",largerText:"Увеличить текст",palette:"Цветовая палитра",language:"Язык интерфейса",darkMode:"Тёмная тема",lightMode:"Светлая тема",fullscreen:"Полный экран",empty:"Выберите документ, чтобы начать.",mediaPreview:"Просмотр медиа",close:"Закрыть",live:"Автообновление",loading:"Загрузка…",loadError:"Не удалось открыть документ.",refreshed:"Документ обновлён",renderedView:"Предпросмотр",sourceView:"Исходный текст",noOutline:"В документе нет заголовков.",noMedia:"В документе нет медиа.",copy:"Копировать",copied:"Скопировано",invalidSource:"Введите корректный URL или локальный путь.",noMatches:"Совпадений не найдено." },
    it: { library:"Libreria documenti",sourcePlaceholder:"Incolla file://, http:// o https://",openSource:"Apri origine",chooseFile:"Scegli documento locale",search:"Cerca documenti",rescan:"Aggiorna elenco",navigation:"Navigazione",files:"File",outline:"Indice",documents:"Documenti",ready:"Pronto",readerSettings:"Impostazioni di lettura",readingMode:"Modalità di lettura",vertical:"Verticale",horizontal:"Orizzontale",paged:"Pagine",source:"Sorgente",media:"Media",smallerText:"Testo più piccolo",largerText:"Testo più grande",palette:"Tavolozza",language:"Lingua",darkMode:"Modalità scura",lightMode:"Modalità chiara",fullscreen:"Schermo intero",empty:"Scegli un documento per iniziare.",mediaPreview:"Anteprima media",close:"Chiudi",live:"Live",loading:"Caricamento…",loadError:"Impossibile aprire il documento.",refreshed:"Documento aggiornato",renderedView:"Anteprima",sourceView:"Testo sorgente",noOutline:"Nessun titolo nel documento.",noMedia:"Nessun media nel documento.",copy:"Copia",copied:"Copiato",invalidSource:"Inserisci un URL o percorso locale valido.",noMatches:"Nessun documento corrispondente." }
  };

  const libraryTranslations = {
    en:{libraryButton:"Library",fileButton:"File",changeLibrary:"Change library folder",noLibraryShort:"No folder selected",noLibrary:"Choose a main folder as the root of your preview library.",rootFolderHint:"A broad folder such as Desktop is a good place to start.",noSupportedFiles:"No supported text files were found in this folder.",chooseAnotherRoot:"Choose another main folder, or enable .txt and .log if needed.",scanning:"Scanning folder… {seconds}s",scanEstimate:"Usually about 2–10 seconds.",scanEstimateLong:"Large folders can take longer; scanning will continue.",resizeSidebar:"Resize document sidebar",libraryChanged:"Library folder updated",folderSelectionUnavailable:"Folder selection is available in the desktop app.",collapseSidebar:"Collapse sidebar",expandSidebar:"Expand sidebar"},
    "zh-Hant":{libraryButton:"資料夾",fileButton:"檔案",changeLibrary:"更換資料庫資料夾",noLibraryShort:"尚未選擇資料夾",noLibrary:"選擇一個主資料夾作為根目錄進行預覽。",rootFolderHint:"建議從 Desktop（桌面）等主要資料夾開始，之後可隨時更換。",noSupportedFiles:"這個資料夾內找不到支援的文字檔案。",chooseAnotherRoot:"請選擇其他主資料夾，或視需要勾選 .txt 與 .log。",scanning:"正在掃描資料夾… {seconds} 秒",scanEstimate:"通常約需 2–10 秒。",scanEstimateLong:"大型資料夾可能需要更久；掃描仍會繼續。",resizeSidebar:"調整文件側欄寬度",libraryChanged:"資料庫資料夾已更新",folderSelectionUnavailable:"資料夾選擇功能僅在桌面 App 提供。",collapseSidebar:"收合側欄",expandSidebar:"展開側欄"},
    "zh-Hans":{libraryButton:"文件夹",fileButton:"文件",changeLibrary:"更换资料库文件夹",noLibraryShort:"尚未选择文件夹",noLibrary:"选择一个主文件夹作为根目录进行预览。",rootFolderHint:"建议从 Desktop（桌面）等主要文件夹开始，之后可随时更换。",noSupportedFiles:"此文件夹内没有支持的文本文件。",chooseAnotherRoot:"请选择其他主文件夹，或按需勾选 .txt 与 .log。",scanning:"正在扫描文件夹… {seconds} 秒",scanEstimate:"通常约需 2–10 秒。",scanEstimateLong:"大型文件夹可能需要更久；扫描仍会继续。",resizeSidebar:"调整文件侧栏宽度",libraryChanged:"资料库文件夹已更新",folderSelectionUnavailable:"文件夹选择功能仅在桌面 App 提供。",collapseSidebar:"收起侧栏",expandSidebar:"展开侧栏"},
    ja:{libraryButton:"フォルダ",fileButton:"ファイル",changeLibrary:"ライブラリフォルダを変更",noLibraryShort:"フォルダ未選択",noLibrary:"最初にライブラリフォルダを選択してください。",libraryChanged:"ライブラリを更新しました",folderSelectionUnavailable:"フォルダ選択はデスクトップアプリで利用できます。",collapseSidebar:"サイドバーを閉じる",expandSidebar:"サイドバーを開く"},
    ko:{libraryButton:"폴더",fileButton:"파일",changeLibrary:"라이브러리 폴더 변경",noLibraryShort:"선택한 폴더 없음",noLibrary:"먼저 라이브러리 폴더를 선택하세요.",libraryChanged:"라이브러리 폴더가 변경되었습니다",folderSelectionUnavailable:"폴더 선택은 데스크톱 앱에서 사용할 수 있습니다.",collapseSidebar:"사이드바 접기",expandSidebar:"사이드바 펼치기"},
    es:{libraryButton:"Carpeta",fileButton:"Archivo",changeLibrary:"Cambiar carpeta",noLibraryShort:"Sin carpeta",noLibrary:"Elige una carpeta para comenzar.",libraryChanged:"Carpeta actualizada",folderSelectionUnavailable:"La selección de carpetas está disponible en la aplicación de escritorio.",collapseSidebar:"Contraer barra lateral",expandSidebar:"Expandir barra lateral"},
    fr:{libraryButton:"Dossier",fileButton:"Fichier",changeLibrary:"Changer de dossier",noLibraryShort:"Aucun dossier",noLibrary:"Choisissez un dossier pour commencer.",libraryChanged:"Dossier mis à jour",folderSelectionUnavailable:"La sélection de dossiers est disponible dans l’application de bureau.",collapseSidebar:"Réduire la barre latérale",expandSidebar:"Développer la barre latérale"},
    de:{libraryButton:"Ordner",fileButton:"Datei",changeLibrary:"Bibliotheksordner ändern",noLibraryShort:"Kein Ordner",noLibrary:"Wähle zuerst einen Bibliotheksordner.",libraryChanged:"Bibliotheksordner aktualisiert",folderSelectionUnavailable:"Die Ordnerauswahl ist in der Desktop-App verfügbar.",collapseSidebar:"Seitenleiste einklappen",expandSidebar:"Seitenleiste ausklappen"},
    "pt-BR":{libraryButton:"Pasta",fileButton:"Arquivo",changeLibrary:"Alterar pasta",noLibraryShort:"Nenhuma pasta",noLibrary:"Escolha uma pasta para começar.",libraryChanged:"Pasta atualizada",folderSelectionUnavailable:"A seleção de pastas está disponível no aplicativo para desktop.",collapseSidebar:"Recolher barra lateral",expandSidebar:"Expandir barra lateral"},
    ru:{libraryButton:"Папка",fileButton:"Файл",changeLibrary:"Сменить папку",noLibraryShort:"Папка не выбрана",noLibrary:"Сначала выберите папку библиотеки.",libraryChanged:"Папка библиотеки обновлена",folderSelectionUnavailable:"Выбор папки доступен в настольном приложении.",collapseSidebar:"Свернуть панель",expandSidebar:"Развернуть панель"},
    it:{libraryButton:"Cartella",fileButton:"File",changeLibrary:"Cambia cartella",noLibraryShort:"Nessuna cartella",noLibrary:"Scegli una cartella per iniziare.",libraryChanged:"Cartella aggiornata",folderSelectionUnavailable:"La selezione delle cartelle è disponibile nell’app desktop.",collapseSidebar:"Comprimi barra laterale",expandSidebar:"Espandi barra laterale"}
  };

  const createTranslations = {
    en:{newMarkdown:"New Markdown",newMarkdownButton:"New md.",createMarkdownTitle:"Create Markdown",createMarkdownCopy:"Add a new Markdown document without leaving your reading flow.",documentName:"Document name",currentFolder:"Current folder",createMarkdownQuestion:"Create “{name}” in “{folder}”?",cancel:"Cancel",create:"Create",documentCreated:"Markdown created",createFailed:"Unable to create this document.",nameRequired:"Enter a document name.",libraryRequired:"Choose a library folder first.",documentExists:"A document with this name already exists in the current folder."},
    "zh-Hant":{newMarkdown:"新增 Markdown",newMarkdownButton:"新增 MD",createMarkdownTitle:"新增 Markdown",createMarkdownCopy:"在不中斷閱讀流程的情況下新增一份 Markdown 文件。",documentName:"文件名稱",currentFolder:"當前資料夾",createMarkdownQuestion:"是否將「{name}」新增至當前資料夾「{folder}」？",cancel:"取消",create:"新增",documentCreated:"Markdown 已新增",createFailed:"無法新增這份文件。",nameRequired:"請輸入文件名稱。",libraryRequired:"請先選擇資料庫資料夾。",documentExists:"當前資料夾已有同名文件。"},
    "zh-Hans":{newMarkdown:"新建 Markdown",newMarkdownButton:"新建 MD",createMarkdownTitle:"新建 Markdown",createMarkdownCopy:"在不中断阅读流程的情况下新建一份 Markdown 文档。",documentName:"文档名称",currentFolder:"当前文件夹",createMarkdownQuestion:"是否将“{name}”新建于当前文件夹“{folder}”？",cancel:"取消",create:"新建",documentCreated:"Markdown 已新建",createFailed:"无法新建此文档。",nameRequired:"请输入文档名称。",libraryRequired:"请先选择资料库文件夹。",documentExists:"当前文件夹已有同名文档。"},
    ja:{newMarkdown:"Markdownを新規作成",newMarkdownButton:"新規 MD",createMarkdownTitle:"Markdownを作成",createMarkdownCopy:"読書を中断せず、新しいMarkdown文書を追加します。",documentName:"文書名",currentFolder:"現在のフォルダ",createMarkdownQuestion:"「{name}」を「{folder}」に作成しますか？",cancel:"キャンセル",create:"作成",documentCreated:"Markdownを作成しました",createFailed:"文書を作成できません。",nameRequired:"文書名を入力してください。",libraryRequired:"先にライブラリフォルダを選択してください。",documentExists:"このフォルダには同名の文書があります。"},
    ko:{newMarkdown:"새 Markdown",newMarkdownButton:"새 MD",createMarkdownTitle:"Markdown 만들기",createMarkdownCopy:"읽기 흐름을 유지하며 새 Markdown 문서를 추가합니다.",documentName:"문서 이름",currentFolder:"현재 폴더",createMarkdownQuestion:"“{name}”을(를) “{folder}”에 만드시겠습니까?",cancel:"취소",create:"만들기",documentCreated:"Markdown을 만들었습니다",createFailed:"문서를 만들 수 없습니다.",nameRequired:"문서 이름을 입력하세요.",libraryRequired:"먼저 라이브러리 폴더를 선택하세요.",documentExists:"현재 폴더에 같은 이름의 문서가 있습니다."},
    es:{newMarkdown:"Nuevo Markdown",newMarkdownButton:"Nuevo MD",createMarkdownTitle:"Crear Markdown",createMarkdownCopy:"Añade un documento Markdown sin interrumpir la lectura.",documentName:"Nombre del documento",currentFolder:"Carpeta actual",createMarkdownQuestion:"¿Crear “{name}” en “{folder}”?",cancel:"Cancelar",create:"Crear",documentCreated:"Markdown creado",createFailed:"No se pudo crear el documento.",nameRequired:"Introduce un nombre.",libraryRequired:"Elige primero una carpeta de biblioteca.",documentExists:"Ya existe un documento con este nombre."},
    fr:{newMarkdown:"Nouveau Markdown",newMarkdownButton:"Nouveau MD",createMarkdownTitle:"Créer un Markdown",createMarkdownCopy:"Ajoutez un document Markdown sans interrompre votre lecture.",documentName:"Nom du document",currentFolder:"Dossier actuel",createMarkdownQuestion:"Créer « {name} » dans « {folder} » ?",cancel:"Annuler",create:"Créer",documentCreated:"Markdown créé",createFailed:"Impossible de créer le document.",nameRequired:"Saisissez un nom.",libraryRequired:"Choisissez d’abord un dossier de bibliothèque.",documentExists:"Un document portant ce nom existe déjà."},
    de:{newMarkdown:"Neues Markdown",newMarkdownButton:"Neue MD",createMarkdownTitle:"Markdown erstellen",createMarkdownCopy:"Ein neues Markdown-Dokument erstellen, ohne den Lesefluss zu verlassen.",documentName:"Dokumentname",currentFolder:"Aktueller Ordner",createMarkdownQuestion:"„{name}“ in „{folder}“ erstellen?",cancel:"Abbrechen",create:"Erstellen",documentCreated:"Markdown erstellt",createFailed:"Dokument konnte nicht erstellt werden.",nameRequired:"Dokumentnamen eingeben.",libraryRequired:"Zuerst einen Bibliotheksordner auswählen.",documentExists:"In diesem Ordner gibt es bereits ein Dokument mit diesem Namen."},
    "pt-BR":{newMarkdown:"Novo Markdown",newMarkdownButton:"Novo MD",createMarkdownTitle:"Criar Markdown",createMarkdownCopy:"Adicione um documento Markdown sem interromper a leitura.",documentName:"Nome do documento",currentFolder:"Pasta atual",createMarkdownQuestion:"Criar “{name}” em “{folder}”?",cancel:"Cancelar",create:"Criar",documentCreated:"Markdown criado",createFailed:"Não foi possível criar o documento.",nameRequired:"Digite um nome.",libraryRequired:"Escolha primeiro uma pasta da biblioteca.",documentExists:"Já existe um documento com este nome."},
    ru:{newMarkdown:"Новый Markdown",newMarkdownButton:"Новый MD",createMarkdownTitle:"Создать Markdown",createMarkdownCopy:"Добавьте документ Markdown, не прерывая чтение.",documentName:"Имя документа",currentFolder:"Текущая папка",createMarkdownQuestion:"Создать «{name}» в «{folder}»?",cancel:"Отмена",create:"Создать",documentCreated:"Markdown создан",createFailed:"Не удалось создать документ.",nameRequired:"Введите имя документа.",libraryRequired:"Сначала выберите папку библиотеки.",documentExists:"В текущей папке уже есть документ с таким именем."},
    it:{newMarkdown:"Nuovo Markdown",newMarkdownButton:"Nuovo MD",createMarkdownTitle:"Crea Markdown",createMarkdownCopy:"Aggiungi un documento Markdown senza interrompere la lettura.",documentName:"Nome documento",currentFolder:"Cartella attuale",createMarkdownQuestion:"Creare “{name}” in “{folder}”?",cancel:"Annulla",create:"Crea",documentCreated:"Markdown creato",createFailed:"Impossibile creare il documento.",nameRequired:"Inserisci un nome.",libraryRequired:"Scegli prima una cartella della libreria.",documentExists:"Esiste già un documento con questo nome."}
  };
  const selectedFolderLabels = {en:"Selected folder","zh-Hant":"選擇的資料夾","zh-Hans":"选择的文件夹",ja:"選択したフォルダ",ko:"선택한 폴더",es:"Carpeta seleccionada",fr:"Dossier sélectionné",de:"Ausgewählter Ordner","pt-BR":"Pasta selecionada",ru:"Выбранная папка",it:"Cartella selezionata"};
  const webSessionLabels = Object.fromEntries(Object.keys(translations).map((locale)=>[locale,"LumaReader Web"]));
  const webSessionTranslations = {
    en:{removeDocument:"Remove from LumaReader Web",removeTitle:"Remove this document?",removeCopy:"This removes “{name}” from LumaReader Web. Your original local file is not deleted.",removeConfirm:"Remove",removeCancel:"Cancel",removed:"Document removed",limitTitle:"Three documents are already open",limitCopy:"LumaReader Web can keep up to {limit} documents at a time. Remove one below to make room and continue.",limitDismiss:"Not now",sessionSaved:"Saved",desktopPrompt:"Need to manage more documents?",desktopAction:"Get LumaReader Desktop →",shareMarkdown:"Share this Markdown",shareCopied:"Markdown share link copied",shareOpened:"Markdown is ready to share",shareUnavailable:"Open a Markdown document before sharing.",shareTooLarge:"This Markdown is too large for a share link.",shareFailed:"Unable to create the share link.",shareInvalid:"This Markdown share link could not be opened.",shareDialogTitle:"Share this Markdown",shareDialogCopy:"This short link keeps a temporary shared copy for 30 days.",shareDialogCanonical:"This built-in example always uses the same permanent Web address.",shareDialogFallback:"The short-link service is temporarily unavailable. This longer link still opens the current document.",shareLinkLabel:"Markdown share link",shareCopy:"Copy share link",shareClose:"Close",dropTitle:"Drop to open Markdown",dropCopy:"You can add up to three documents.",dropUnsupported:"Drop a Markdown or plain-text document."},
    "zh-Hant":{removeDocument:"從 LumaReader Web 移除",removeTitle:"要移除這份文件嗎？",removeCopy:"只會將「{name}」從 LumaReader Web 移除，不會刪除你電腦裡的原始檔案。",removeConfirm:"移除",removeCancel:"取消",removed:"文件已移除",limitTitle:"已開啟 3 份文件",limitCopy:"LumaReader Web 同時最多保留 {limit} 份文件。請先移除下列其中一份，空出位置後即可繼續。",limitDismiss:"暫時不要",sessionSaved:"已儲存",desktopPrompt:"需要長期管理更多文件？",desktopAction:"下載 LumaReader 桌面版 →",shareMarkdown:"分享這份 Markdown",shareCopied:"Markdown 分享連結已複製",shareOpened:"已準備分享這份 Markdown",shareUnavailable:"請先開啟一份 Markdown 再分享。",shareTooLarge:"這份 Markdown 太大，無法放進分享連結。",shareFailed:"目前無法建立分享連結。",shareInvalid:"無法開啟這個 Markdown 分享連結。",shareDialogTitle:"分享這份 Markdown",shareDialogCopy:"這是 30 天內有效的短網址；期間會暫存這份文件的分享副本。",shareDialogCanonical:"這是網站內建的示範文件，會固定使用同一個永久網址。",shareDialogFallback:"短網址服務暫時無法使用，以下較長的連結仍可正常開啟目前文件。",shareLinkLabel:"Markdown 分享連結",shareCopy:"複製分享連結",shareClose:"關閉",dropTitle:"放開以開啟 Markdown",dropCopy:"一次最多加入 3 份文件。",dropUnsupported:"請拖入 Markdown 或純文字文件。"},
    "zh-Hans":{removeDocument:"从 LumaReader Web 移除",removeTitle:"要移除此文档吗？",removeCopy:"只会将“{name}”从 LumaReader Web 移除，不会删除电脑中的原始文件。",removeConfirm:"移除",removeCancel:"取消",removed:"文档已移除",limitTitle:"已打开 3 份文档",limitCopy:"LumaReader Web 同时最多保留 {limit} 份文档。请先移除其中一份，腾出空间后即可继续。",limitDismiss:"暂时不要",sessionSaved:"已保存",desktopPrompt:"需要长期管理更多文档？",desktopAction:"下载 LumaReader 桌面版 →",shareMarkdown:"分享这份 Markdown",shareCopied:"Markdown 分享链接已复制",shareOpened:"已准备分享这份 Markdown",shareUnavailable:"请先打开一份 Markdown 再分享。",shareTooLarge:"这份 Markdown 太大，无法放进分享链接。",shareFailed:"目前无法创建分享链接。",shareInvalid:"无法打开这个 Markdown 分享链接。",shareDialogTitle:"分享这份 Markdown",shareDialogCopy:"这是 30 天内有效的短链接；期间会暂存这份文档的分享副本。",shareDialogCanonical:"这是网站内置的示例文档，会固定使用同一个永久网址。",shareDialogFallback:"短链接服务暂时不可用，以下较长的链接仍可正常打开当前文档。",shareLinkLabel:"Markdown 分享链接",shareCopy:"复制分享链接",shareClose:"关闭",dropTitle:"松开以打开 Markdown",dropCopy:"一次最多加入 3 份文档。",dropUnsupported:"请拖入 Markdown 或纯文本文档。"},
    ja:{sessionCapacity:"{count} / {limit} · タブを閉じると消去",removeDocument:"このセッションから削除",removeTitle:"この文書を削除しますか？",removeCopy:"現在のブラウザーセッションからのみ削除され、ローカルの元ファイルは削除されません。",removeConfirm:"削除",removeCancel:"キャンセル",removed:"セッションから削除しました",limitTitle:"セッションが上限です",limitCopy:"同時に保持できる文書は {limit} 件までです。待機中の文書を開くには、1 件削除してください。",limitDismiss:"後で",sessionSaved:"このセッションに保存しました"},
    ko:{sessionCapacity:"{count} / {limit} · 탭을 닫으면 삭제",removeDocument:"이 세션에서 제거",removeTitle:"이 문서를 제거할까요?",removeCopy:"현재 브라우저 세션에서만 제거되며 원본 로컬 파일은 삭제되지 않습니다.",removeConfirm:"제거",removeCancel:"취소",removed:"세션에서 제거했습니다",limitTitle:"세션이 가득 찼습니다",limitCopy:"동시에 최대 {limit}개 문서를 보관합니다. 대기 중인 문서를 열려면 하나를 제거하세요.",limitDismiss:"나중에",sessionSaved:"이 세션에 저장됨"},
    es:{sessionCapacity:"{count} / {limit} · Se borra al cerrar la pestaña",removeDocument:"Quitar de esta sesión",removeTitle:"¿Quitar este documento?",removeCopy:"Solo se quitará de la sesión actual. El archivo local original no se eliminará.",removeConfirm:"Quitar",removeCancel:"Cancelar",removed:"Quitado de esta sesión",limitTitle:"La sesión está llena",limitCopy:"Se pueden conservar hasta {limit} documentos. Quita uno para abrir el documento pendiente.",limitDismiss:"Ahora no",sessionSaved:"Guardado en esta sesión"},
    fr:{sessionCapacity:"{count} / {limit} · Effacé à la fermeture de l’onglet",removeDocument:"Retirer de cette session",removeTitle:"Retirer ce document ?",removeCopy:"Il sera uniquement retiré de la session actuelle. Le fichier local d’origine ne sera pas supprimé.",removeConfirm:"Retirer",removeCancel:"Annuler",removed:"Retiré de cette session",limitTitle:"La session est pleine",limitCopy:"Vous pouvez conserver jusqu’à {limit} documents. Retirez-en un pour ouvrir le document en attente.",limitDismiss:"Plus tard",sessionSaved:"Enregistré pour cette session"},
    de:{sessionCapacity:"{count} / {limit} · Beim Schließen des Tabs gelöscht",removeDocument:"Aus dieser Sitzung entfernen",removeTitle:"Dokument entfernen?",removeCopy:"Es wird nur aus der aktuellen Sitzung entfernt. Die lokale Originaldatei bleibt erhalten.",removeConfirm:"Entfernen",removeCancel:"Abbrechen",removed:"Aus der Sitzung entfernt",limitTitle:"Sitzung ist voll",limitCopy:"Es können bis zu {limit} Dokumente gleichzeitig geöffnet sein. Entferne eines für das wartende Dokument.",limitDismiss:"Später",sessionSaved:"Für diese Sitzung gespeichert"},
    "pt-BR":{sessionCapacity:"{count} / {limit} · Limpo ao fechar a aba",removeDocument:"Remover desta sessão",removeTitle:"Remover este documento?",removeCopy:"Ele será removido apenas da sessão atual. O arquivo local original não será excluído.",removeConfirm:"Remover",removeCancel:"Cancelar",removed:"Removido desta sessão",limitTitle:"A sessão está cheia",limitCopy:"É possível manter até {limit} documentos. Remova um para abrir o documento em espera.",limitDismiss:"Agora não",sessionSaved:"Salvo nesta sessão"},
    ru:{sessionCapacity:"{count} / {limit} · Очистится при закрытии вкладки",removeDocument:"Удалить из сеанса",removeTitle:"Удалить документ?",removeCopy:"Он будет удалён только из текущего сеанса. Исходный локальный файл останется без изменений.",removeConfirm:"Удалить",removeCancel:"Отмена",removed:"Удалено из сеанса",limitTitle:"Сеанс заполнен",limitCopy:"Одновременно можно хранить до {limit} документов. Удалите один, чтобы открыть ожидающий документ.",limitDismiss:"Не сейчас",sessionSaved:"Сохранено в этом сеансе"},
    it:{sessionCapacity:"{count} / {limit} · Eliminato alla chiusura della scheda",removeDocument:"Rimuovi da questa sessione",removeTitle:"Rimuovere questo documento?",removeCopy:"Verrà rimosso solo dalla sessione corrente. Il file locale originale non sarà eliminato.",removeConfirm:"Rimuovi",removeCancel:"Annulla",removed:"Rimosso dalla sessione",limitTitle:"La sessione è piena",limitCopy:"Puoi conservare fino a {limit} documenti. Rimuovine uno per aprire quello in attesa.",limitDismiss:"Non ora",sessionSaved:"Salvato per questa sessione"}
  };
  Object.entries(createTranslations).forEach(([locale,copy])=>{copy.newMarkdownButton=copy.newMarkdownButton.replace(/\bMD\b/,"md.");copy.currentFolder=selectedFolderLabels[locale]||selectedFolderLabels.en;});
  createTranslations["zh-Hant"].createMarkdownQuestion="是否將「{name}」新增至「{folder}」？";
  createTranslations["zh-Hans"].createMarkdownQuestion="是否将“{name}”新建于“{folder}”？";

  const imageTranslations = {
    en:{preview:"Image preview",actual:"Actual size",fit:"Fit to window",close:"Close image preview",open:"View full image",unavailable:"Image unavailable"},
    "zh-Hant":{preview:"圖片預覽",actual:"原始尺寸",fit:"符合視窗",close:"關閉圖片預覽",open:"檢視完整圖片",unavailable:"圖片無法顯示"},
    "zh-Hans":{preview:"图片预览",actual:"原始尺寸",fit:"适合窗口",close:"关闭图片预览",open:"查看完整图片",unavailable:"图片无法显示"}
  };

  const editorTranslations = {
    en:{edit:"Edit",save:"Save",saved:"Saved",exitEdit:"Exit editing",discardEdits:"Discard edits",comparisonPreview:"Preview",markdownEditor:"Markdown source editor",editing:"Editing Markdown · ⌘S / Ctrl+S to save",saveFailed:"Unable to save this document.",editUnavailable:"Only Markdown files inside the selected library can be edited.",unsavedBlocked:"Exit editing before opening another document.",discarded:"Edits discarded.",changedExternally:"This document changed outside LumaReader. Reopen it before saving."},
    "zh-Hant":{edit:"編輯",save:"儲存",saved:"已儲存",exitEdit:"退出編輯",discardEdits:"放棄修改",comparisonPreview:"對照預覽",markdownEditor:"Markdown 原文編輯器",editing:"正在編輯 Markdown · 按 ⌘S / Ctrl+S 儲存",saveFailed:"無法儲存這份文件。",editUnavailable:"只有所選資料庫內的 Markdown 文件可以編輯。",unsavedBlocked:"請先退出編輯介面，再開啟其他文件。",discarded:"已放棄這次修改。",changedExternally:"這份文件已在 LumaReader 外被修改，請重新開啟後再儲存。"},
    "zh-Hans":{edit:"编辑",save:"保存",saved:"已保存",exitEdit:"退出编辑",discardEdits:"放弃修改",comparisonPreview:"对照预览",markdownEditor:"Markdown 原文编辑器",editing:"正在编辑 Markdown · 按 ⌘S / Ctrl+S 保存",saveFailed:"无法保存此文档。",editUnavailable:"只能编辑所选资料库内的 Markdown 文档。",unsavedBlocked:"请先退出编辑界面，再打开其他文档。",discarded:"已放弃此次修改。",changedExternally:"此文档已在 LumaReader 外被修改，请重新打开后再保存。"},
    ja:{edit:"編集",save:"保存",saved:"保存済み",exitEdit:"編集を終了",discardEdits:"変更を破棄",markdownEditor:"Markdown ソースエディター",editing:"Markdown を編集中 · ⌘S / Ctrl+S で保存",saveFailed:"文書を保存できません。",editUnavailable:"選択したライブラリ内の Markdown のみ編集できます。",unsavedBlocked:"別の文書を開く前に編集を終了してください。",discarded:"編集内容を破棄しました。",changedExternally:"この文書は外部で変更されました。開き直してから保存してください。"},
    ko:{edit:"편집",save:"저장",saved:"저장됨",exitEdit:"편집 종료",discardEdits:"변경 취소",markdownEditor:"Markdown 원문 편집기",editing:"Markdown 편집 중 · ⌘S / Ctrl+S로 저장",saveFailed:"문서를 저장할 수 없습니다.",editUnavailable:"선택한 라이브러리 안의 Markdown만 편집할 수 있습니다.",unsavedBlocked:"다른 문서를 열기 전에 편집을 종료하세요.",discarded:"편집 내용을 버렸습니다.",changedExternally:"문서가 외부에서 변경되었습니다. 다시 연 후 저장하세요."},
    es:{edit:"Editar",save:"Guardar",saved:"Guardado",exitEdit:"Salir de edición",discardEdits:"Descartar cambios",markdownEditor:"Editor de código Markdown",editing:"Editando Markdown · ⌘S / Ctrl+S para guardar",saveFailed:"No se pudo guardar el documento.",editUnavailable:"Solo se puede editar Markdown dentro de la biblioteca seleccionada.",unsavedBlocked:"Sal de la edición antes de abrir otro documento.",discarded:"Cambios descartados.",changedExternally:"El documento cambió fuera de LumaReader. Vuelve a abrirlo antes de guardar."},
    fr:{edit:"Modifier",save:"Enregistrer",saved:"Enregistré",exitEdit:"Quitter la modification",discardEdits:"Ignorer les modifications",markdownEditor:"Éditeur source Markdown",editing:"Modification du Markdown · ⌘S / Ctrl+S pour enregistrer",saveFailed:"Impossible d’enregistrer le document.",editUnavailable:"Seuls les fichiers Markdown de la bibliothèque sélectionnée sont modifiables.",unsavedBlocked:"Quittez la modification avant d’ouvrir un autre document.",discarded:"Modifications annulées.",changedExternally:"Ce document a été modifié hors de LumaReader. Rouvrez-le avant d’enregistrer."},
    de:{edit:"Bearbeiten",save:"Speichern",saved:"Gespeichert",exitEdit:"Bearbeiten beenden",discardEdits:"Änderungen verwerfen",markdownEditor:"Markdown-Quelltexteditor",editing:"Markdown wird bearbeitet · ⌘S / Strg+S zum Speichern",saveFailed:"Dokument konnte nicht gespeichert werden.",editUnavailable:"Nur Markdown in der gewählten Bibliothek kann bearbeitet werden.",unsavedBlocked:"Bearbeitung vor dem Öffnen eines anderen Dokuments beenden.",discarded:"Änderungen verworfen.",changedExternally:"Das Dokument wurde außerhalb von LumaReader geändert. Vor dem Speichern neu öffnen."},
    "pt-BR":{edit:"Editar",save:"Salvar",saved:"Salvo",exitEdit:"Sair da edição",discardEdits:"Descartar alterações",markdownEditor:"Editor de fonte Markdown",editing:"Editando Markdown · ⌘S / Ctrl+S para salvar",saveFailed:"Não foi possível salvar o documento.",editUnavailable:"Somente Markdown dentro da biblioteca selecionada pode ser editado.",unsavedBlocked:"Saia da edição antes de abrir outro documento.",discarded:"Alterações descartadas.",changedExternally:"O documento mudou fora do LumaReader. Abra-o novamente antes de salvar."},
    ru:{edit:"Редактировать",save:"Сохранить",saved:"Сохранено",exitEdit:"Выйти из редактора",discardEdits:"Отменить изменения",markdownEditor:"Редактор исходного Markdown",editing:"Редактирование Markdown · ⌘S / Ctrl+S для сохранения",saveFailed:"Не удалось сохранить документ.",editUnavailable:"Можно редактировать только Markdown из выбранной библиотеки.",unsavedBlocked:"Выйдите из редактора перед открытием другого документа.",discarded:"Изменения отменены.",changedExternally:"Документ изменён вне LumaReader. Откройте его заново перед сохранением."},
    it:{edit:"Modifica",save:"Salva",saved:"Salvato",exitEdit:"Esci dalla modifica",discardEdits:"Scarta modifiche",markdownEditor:"Editor sorgente Markdown",editing:"Modifica Markdown · ⌘S / Ctrl+S per salvare",saveFailed:"Impossibile salvare il documento.",editUnavailable:"È possibile modificare solo Markdown nella libreria selezionata.",unsavedBlocked:"Esci dalla modifica prima di aprire un altro documento.",discarded:"Modifiche annullate.",changedExternally:"Il documento è cambiato fuori da LumaReader. Riaprilo prima di salvare."}
  };
  const comparisonPreviewLabels = {en:["Preview","Resize editor and preview"],"zh-Hant":["對照預覽","調整原文與預覽大小"],"zh-Hans":["对照预览","调整原文与预览大小"],ja:["プレビュー","エディターとプレビューのサイズを変更"],ko:["미리보기","편집기와 미리보기 크기 조절"],es:["Vista previa","Cambiar el tamaño del editor y la vista previa"],fr:["Aperçu","Redimensionner l’éditeur et l’aperçu"],de:["Vorschau","Editor und Vorschau skalieren"],"pt-BR":["Prévia","Redimensionar editor e prévia"],ru:["Предпросмотр","Изменить размер редактора и предпросмотра"],it:["Anteprima","Ridimensiona editor e anteprima"]};
  Object.entries(comparisonPreviewLabels).forEach(([locale,[label,resizeLabel]])=>{editorTranslations[locale].comparisonPreview=label;editorTranslations[locale].resizeEditorPreview=resizeLabel;});
  const previewEndLabels = {en:"Show bottom","zh-Hant":"顯示最底部","zh-Hans":"显示最底部",ja:"末尾を表示",ko:"맨 아래 보기",es:"Mostrar final",fr:"Afficher la fin",de:"Ende anzeigen","pt-BR":"Mostrar final",ru:"Показать конец",it:"Mostra fine"};
  Object.entries(previewEndLabels).forEach(([locale,label])=>{editorTranslations[locale].showPreviewEnd=label;});
  const editingBlockedLabels = {
    en:["Editing is still active","Save or exit editing before opening another document."],
    "zh-Hant":["目前文件仍在編輯中","請先儲存或退出編輯模式，再開啟其他文件。"],
    "zh-Hans":["当前文档仍在编辑中","请先保存或退出编辑模式，再打开其他文档。"],
    ja:["編集中の文書があります","保存するか編集を終了してから、別の文書を開いてください。"],
    ko:["현재 문서를 편집 중입니다","저장하거나 편집을 종료한 뒤 다른 문서를 여세요."],
    es:["La edición sigue activa","Guarda o sal de la edición antes de abrir otro documento."],
    fr:["La modification est toujours active","Enregistrez ou quittez la modification avant d’ouvrir un autre document."],
    de:["Die Bearbeitung ist noch aktiv","Speichere oder beende die Bearbeitung, bevor du ein anderes Dokument öffnest."],
    "pt-BR":["A edição ainda está ativa","Salve ou saia da edição antes de abrir outro documento."],
    ru:["Редактирование ещё активно","Сохраните документ или выйдите из редактора перед открытием другого файла."],
    it:["La modifica è ancora attiva","Salva o esci dalla modifica prima di aprire un altro documento."]
  };
  Object.entries(editingBlockedLabels).forEach(([locale,[title,detail]])=>{editorTranslations[locale].editingBlockedTitle=title;editorTranslations[locale].editingBlockedDetail=detail;});

  const pdfTranslations = {
    en:{exportPdf:"Export PDF",exportingPdf:"Preparing PDF…",pdfExported:"PDF exported",pdfExportFailed:"Unable to export this document as PDF.",pdfUnavailable:"Open a document before exporting PDF."},
    "zh-Hant":{exportPdf:"匯出 PDF",exportingPdf:"正在準備 PDF…",pdfExported:"PDF 已匯出",pdfExportFailed:"無法將這份文件匯出為 PDF。",pdfUnavailable:"請先開啟一份文件，再匯出 PDF。"},
    "zh-Hans":{exportPdf:"导出 PDF",exportingPdf:"正在准备 PDF…",pdfExported:"PDF 已导出",pdfExportFailed:"无法将此文档导出为 PDF。",pdfUnavailable:"请先打开一份文档，再导出 PDF。"},
    ja:{exportPdf:"PDF に書き出す",exportingPdf:"PDF を準備中…",pdfExported:"PDF を書き出しました",pdfExportFailed:"PDF を書き出せません。",pdfUnavailable:"先に文書を開いてください。"},
    ko:{exportPdf:"PDF 내보내기",exportingPdf:"PDF 준비 중…",pdfExported:"PDF를 내보냈습니다",pdfExportFailed:"PDF를 내보낼 수 없습니다.",pdfUnavailable:"먼저 문서를 여세요."},
    es:{exportPdf:"Exportar PDF",exportingPdf:"Preparando PDF…",pdfExported:"PDF exportado",pdfExportFailed:"No se pudo exportar el PDF.",pdfUnavailable:"Abre un documento antes de exportarlo."},
    fr:{exportPdf:"Exporter en PDF",exportingPdf:"Préparation du PDF…",pdfExported:"PDF exporté",pdfExportFailed:"Impossible d’exporter le PDF.",pdfUnavailable:"Ouvrez un document avant de l’exporter."},
    de:{exportPdf:"PDF exportieren",exportingPdf:"PDF wird vorbereitet…",pdfExported:"PDF exportiert",pdfExportFailed:"PDF konnte nicht exportiert werden.",pdfUnavailable:"Vor dem Export ein Dokument öffnen."},
    "pt-BR":{exportPdf:"Exportar PDF",exportingPdf:"Preparando PDF…",pdfExported:"PDF exportado",pdfExportFailed:"Não foi possível exportar o PDF.",pdfUnavailable:"Abra um documento antes de exportar."},
    ru:{exportPdf:"Экспорт PDF",exportingPdf:"Подготовка PDF…",pdfExported:"PDF экспортирован",pdfExportFailed:"Не удалось экспортировать PDF.",pdfUnavailable:"Сначала откройте документ."},
    it:{exportPdf:"Esporta PDF",exportingPdf:"Preparazione PDF…",pdfExported:"PDF esportato",pdfExportFailed:"Impossibile esportare il PDF.",pdfUnavailable:"Apri un documento prima di esportare."}
  };

  const toolbarTooltips = {
    en:{readingMode:"Choose reading mode",source:"View original Markdown",edit:"Edit Markdown source",save:"Save changes · Shortcut: ⌘S / Ctrl+S",saved:"Saved",exitEdit:"Exit editing",discardEdits:"Discard unsaved changes",media:"Open media preview",shareMarkdown:"Share this Markdown with a link",exportPdf:"Export the current document as PDF",fontDown:"Smaller text · Shortcut: ⌘− / Ctrl−",fontUp:"Larger text · Shortcut: ⌘+ / Ctrl+",palette:"Choose a palette",language:"Choose interface language",theme:"Light / dark mode"},
    "zh-Hant":{readingMode:"選擇閱讀模式",source:"檢視 Markdown 原文",edit:"編輯 Markdown 原文",save:"儲存修改 · 快捷鍵：⌘S / Ctrl+S",saved:"已儲存",exitEdit:"退出編輯",discardEdits:"放棄未儲存修改",media:"開啟媒體預覽",shareMarkdown:"用連結分享這份 Markdown",exportPdf:"將目前文件匯出為 PDF",fontDown:"縮小文字 · 快捷鍵：⌘− / Ctrl−",fontUp:"放大文字 · 快捷鍵：⌘+ / Ctrl+",palette:"選擇色系",language:"選擇介面語言",theme:"亮色／暗色模式"},
    "zh-Hans":{readingMode:"选择阅读模式",source:"查看 Markdown 原文",edit:"编辑 Markdown 原文",save:"保存修改 · 快捷键：⌘S / Ctrl+S",saved:"已保存",exitEdit:"退出编辑",discardEdits:"放弃未保存修改",media:"打开媒体预览",shareMarkdown:"用链接分享这份 Markdown",fontDown:"缩小文字 · 快捷键：⌘− / Ctrl−",fontUp:"放大文字 · 快捷键：⌘+ / Ctrl+",palette:"选择配色",language:"选择界面语言",theme:"浅色／深色模式"}
  };

  const palettes = [
    ["dream-rose","Dream Rose","夢幻粉櫻",["#fff2f7","#c54f7e","#f6d6e3"]],
    ["lavender-mist","Lavender Mist","薰衣草霧",["#f7f2ff","#8f69c4","#e8dcf8"]],
    ["sakura-milk","Sakura Milk","櫻花牛奶",["#fff5f7","#d86f8b","#f8dce4"]],
    ["peach-dawn","Peach Dawn","蜜桃晨光",["#fff5ef","#d9785c","#f8ddcf"]],
    ["apricot-cream","Apricot Cream","杏桃奶油",["#fff8ef","#c98449","#f4e1c8"]],
    ["honey-tea","Honey Tea","蜂蜜伯爵",["#fff9e9","#b9842f","#f2e2b7"]],
    ["matcha-cloud","Matcha Cloud","抹茶雲",["#f5f8ef","#779451","#dfe9cf"]],
    ["mint-glass","Mint Glass","薄荷玻璃",["#effaf7","#3d9b83","#d2eee6"]],
    ["seafoam-pearl","Seafoam Pearl","海沫珍珠",["#effafa","#3d9495","#d4eded"]],
    ["sky-ribbon","Sky Ribbon","晴空絲帶",["#eff8ff","#4c90c8","#d7eafa"]],
    ["moonlight-blue","Moonlight Blue","月光藍",["#f1f5ff","#5b78ba","#dce5f8"]],
    ["iris-violet","Iris Violet","鳶尾紫",["#f6f1ff","#805db4","#e7daf7"]],
    ["blueberry-milk","Blueberry Milk","藍莓牛奶",["#f3f4ff","#6874be","#dfe2f8"]],
    ["grape-velvet","Grape Velvet","葡萄天鵝絨",["#faf1fb","#9b5da0","#efdaef"]],
    ["rosewood","Rosewood","玫瑰木",["#fff3f4","#aa5c69","#f0d9dd"]],
    ["cocoa-berry","Cocoa Berry","可可莓果",["#fbf5f1","#9b6a55","#eadbd3"]],
    ["champagne-gold","Champagne Gold","香檳金",["#fffaf0","#a88745","#eee3c8"]],
    ["silver-lilac","Silver Lilac","銀霧丁香",["#f7f6fa","#817893","#e5e1eb"]],
    ["aurora-teal","Aurora Teal","極光青",["#eff9f8","#2d8d8b","#d0ece9"]],
    ["ink-paper","Ink Paper","墨色紙張",["#f5f5f2","#536b78","#dce3e5"]],
    ["studio-white","Studio White","商務純白",["#ffffff","#52606f","#e7eaf0"]],
    ["graphite","Graphite","石墨灰",["#17191c","#9da5b0","#393e45"]]
  ].map(([id,name,zh,colors]) => ({id,name,zh,colors}));

  const emojiMap = { smile:"😊",heart:"❤️",sparkles:"✨",star:"⭐",warning:"⚠️",info:"ℹ️",check:"✅",x:"❌",rocket:"🚀",bulb:"💡",book:"📖",memo:"📝",fire:"🔥",tada:"🎉",eyes:"👀",wave:"👋",thumbsup:"👍",coffee:"☕" };
  const state = {
    files: [], currentPath:"", currentSource:"", currentBase:"", currentName:"", sourceType:"", rawText:"", renderText:"",
    modifiedNs:null, fontSize:Number(localStorage.getItem("lumareader-font") || localStorage.getItem("md-reader-font") || 18),
    mode:localStorage.getItem("lumareader-mode") || localStorage.getItem("md-reader-mode") || "vertical",
    pagedDirection:localStorage.getItem("lumareader-paged-direction")==="vertical"?"vertical":"horizontal",
    language:localStorage.getItem("lumareader-language") || "en", palette:localStorage.getItem("lumareader-palette") || localStorage.getItem("md-reader-palette") || "dream-rose",
    openFolders:new Set(), view:"rendered", liveTimer:null, lastWheelAt:0, media:[], libraryRoot:null,
    sidebarCollapsed:localStorage.getItem("lumareader-sidebar-collapsed")==="true",sidebarWidth:Number(localStorage.getItem("lumareader-sidebar-width")||320),
    enabledExtensions:new Set(MARKDOWN_EXTENSIONS), typeCatalog:new Map(), documentKind:"markdown", activeAdapter:null,
    documentRequestId:0, documentAbortController:null, libraryRefreshId:0,libraryScanId:0,libraryScanTimer:null,libraryScanStartedAt:0,
    imageViewerActual:false,editing:false,editorDirty:false,editorSaved:false,saving:false,editorPreview:localStorage.getItem("lumareader-editor-preview")!=="false",editorPreviewTimer:null,editorSplitRatio:Math.max(.25,Math.min(.75,Number(localStorage.getItem("lumareader-editor-split")||.5))),editorScrollSyncing:false,editorScrollFrame:null,editorScrollMapFrame:null,editorPreviewBlocks:[],editorSourceToPreview:[],editorPreviewToSource:[],
    creatingDocument:false,choosingCreateDirectory:false,createDirectory:"",createDirectoryPath:"",createDestinationToken:"",pendingWebFiles:[],sessionDialogPath:"",sessionDialogMode:"remove"
  };

  const $ = (selector) => document.querySelector(selector);
  const treeEl = $("#files-panel"), outlineEl = $("#outline-panel"), contentEl = $("#content"), rawEl = $("#raw-source"), sourceEditorEl = $("#source-editor");
  const searchEl = $("#search"), nameEl = $("#file-name"), pathEl = $("#file-path");
  const progressEl = $("#progress"), sidebarEl = $("#sidebar"), shellEl = $("#reader-shell"), pageNumberEl = $("#page-number");
  const pagedNavigationEl = $("#paged-navigation"), pagePreviousEl = $("#page-previous"), pageNextEl = $("#page-next");
  const paletteToggleEl = $("#palette-toggle"), paletteMenuEl = $("#palette-menu"), paletteNameEl = $("#palette-name");
  const languageEl = $("#language"), languageToggleEl = $("#language-toggle"), languageMenuEl = $("#language-menu"), languageNameEl = $("#language-name");
  const themeEl = $("#theme"), mediaPanelEl = $("#media-panel"), mediaGridEl = $("#media-grid"), scrimEl = $("#panel-scrim");
  const libraryRootEl = $("#library-root"), sidebarToggleEl = $("#sidebar-toggle"), sidebarResizerEl = $("#sidebar-resizer"), toolbarTooltipEl = $("#toolbar-tooltip");
  const imageViewerEl = $("#image-viewer"), imageViewerImageEl = $("#image-viewer-image"), imageViewerCaptionEl = $("#image-viewer-caption"), imageViewerSizeEl = $("#image-viewer-size");
  const readingModeEl = $("#reading-mode"), readingModeControlEl = $("#reading-mode-control"), readingModeToggleEl = $("#reading-mode-toggle"), readingModeMenuEl = $("#reading-mode-menu"), readingModeNameEl = $("#reading-mode-name"), readingModeIconEl = $("#reading-mode-icon");
  const newMarkdownButtonEl = $("#new-markdown"), newMarkdownDialogEl = $("#new-markdown-dialog"), newMarkdownFormEl = $("#new-markdown-form"), newMarkdownNameEl = $("#new-markdown-name");
  const newMarkdownSuffixEl = $("#new-markdown-suffix"), newMarkdownDestinationEl = $("#new-markdown-destination"), newMarkdownConfirmationEl = $("#new-markdown-confirmation"), newMarkdownErrorEl = $("#new-markdown-error"), newMarkdownCreateEl = $("#new-markdown-create");
  const editorPreviewControlEl = $("#editor-preview-control"), editorPreviewToggleEl = $("#editor-preview-toggle"), editorPreviewResizerEl = $("#editor-preview-resizer"), editorPreviewEndEl = $("#editor-preview-end");
  const shareButtonEl = $("#share-document"), dropOverlayEl = $("#drop-overlay"), shareDialogEl = $("#share-dialog"), shareDialogCopyEl = $("#share-dialog-copy"), shareLinkOutputEl = $("#share-link-output"), sessionDialogEl = $("#session-dialog"), sessionDialogTitleEl = $("#session-dialog-title"), sessionDialogCopyEl = $("#session-dialog-copy"), sessionDialogFilesEl = $("#session-dialog-files"), sessionDialogConfirmEl = $("#session-dialog-confirm"), sessionDialogCancelEl = $("#session-dialog-cancel"), sessionDesktopLinkEl = $("#session-desktop-link");

  document.body.append(readingModeMenuEl,paletteMenuEl,languageMenuEl);

  function t(key) { return webSessionTranslations[state.language]?.[key] || pdfTranslations[state.language]?.[key] || createTranslations[state.language]?.[key] || editorTranslations[state.language]?.[key] || libraryTranslations[state.language]?.[key] || translations[state.language]?.[key] || webSessionTranslations.en[key] || pdfTranslations.en[key] || createTranslations.en[key] || editorTranslations.en[key] || libraryTranslations.en[key] || translations.en[key] || key; }
  function imageT(key){return imageTranslations[state.language]?.[key]||imageTranslations.en[key]||key;}
  function extensionOf(value){const match=String(value||"").toLowerCase().match(/(\.[a-z0-9]+)(?:[?#].*)?$/);return match?match[1]:"";}
  function isMarkdown(value){return MARKDOWN_EXTENSIONS.includes(extensionOf(value));}
  function currentFormatIsEnabled(file){const extension=file.extension||file.ext||extensionOf(file.path);return state.enabledExtensions.has(extension);}
  function fallbackType(extension){
    if(MARKDOWN_EXTENSIONS.includes(extension))return{kind:"markdown",mime:"text/markdown",binary:false,capabilities:{paged:true,source:true,media:true}};
    if(extension===".txt")return{kind:"text",mime:"text/plain",binary:false,capabilities:{paged:true,source:true,wrap:true}};
    if(extension===".log")return{kind:"log",mime:"text/plain",binary:false,capabilities:{paged:true,source:true,wrap:true}};
    return null;
  }
  function persistPreferences(patch){
    window.lumaDesktop?.setPreferences?.(patch).catch((error)=>console.warn("Unable to persist preferences",error));
  }
  async function hydratePreferences(){
    const saved=await window.lumaDesktop?.getPreferences?.().catch(()=>null);
    if(!saved)return {};
    if(Number.isFinite(saved.fontSize))state.fontSize=saved.fontSize;
    if(typeof saved.editorPreview==="boolean")state.editorPreview=saved.editorPreview;
    if(Number.isFinite(saved.editorSplitRatio))state.editorSplitRatio=Math.max(.25,Math.min(.75,saved.editorSplitRatio));
    if(typeof saved.language==="string")state.language=saved.language;
    if(typeof saved.palette==="string")state.palette=saved.palette;
    if(typeof saved.readingMode==="string")state.mode=saved.readingMode;
    if(["horizontal","vertical"].includes(saved.pagedDirection))state.pagedDirection=saved.pagedDirection;
    if(typeof saved.sidebarCollapsed==="boolean")state.sidebarCollapsed=saved.sidebarCollapsed;
    if(Number.isFinite(saved.sidebarWidth))state.sidebarWidth=saved.sidebarWidth;
    if(saved.theme==="dark")document.documentElement.classList.add("dark");
    if(saved.theme==="light")document.documentElement.classList.remove("dark");
    return saved;
  }
  function escapeHtml(value) { return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }
  function isDocumentHref(value) { return SUPPORTED_EXTENSIONS.some((ext) => value.toLowerCase().split(/[?#]/)[0].endsWith(ext)); }
  function paletteLabel(palette) { return state.language.startsWith("zh") ? palette.zh : palette.name; }
  function toolbarTooltip(key){return toolbarTooltips[state.language]?.[key]||toolbarTooltips.en[key]||key;}
  function updateToolbarTooltips(){document.querySelectorAll(".reader-actions [data-tooltip-key]").forEach((element)=>{element.dataset.tooltip=toolbarTooltip(element.dataset.tooltipKey);element.removeAttribute("title");element.setAttribute("aria-describedby","toolbar-tooltip");});}
  function showToolbarTooltip(target){const copy=target?.dataset.tooltip;if(!copy)return;toolbarTooltipEl.textContent=copy;toolbarTooltipEl.hidden=false;const rect=target.getBoundingClientRect(),tip=toolbarTooltipEl.getBoundingClientRect();const left=Math.max(8,Math.min(innerWidth-tip.width-8,rect.left+(rect.width-tip.width)/2));toolbarTooltipEl.style.left=`${left}px`;toolbarTooltipEl.style.top=`${Math.max(8,rect.top-tip.height-7)}px`;}
  function hideToolbarTooltip(){toolbarTooltipEl.hidden=true;}

  async function waitForPdfAssets(){
    if(document.fonts?.ready)await document.fonts.ready.catch(()=>{});
    const pending=[...contentEl.querySelectorAll("img")].filter((image)=>!image.complete).map((image)=>new Promise((resolve)=>{let settled=false;const done=()=>{if(settled)return;settled=true;resolve();};image.addEventListener("load",done,{once:true});image.addEventListener("error",done,{once:true});setTimeout(done,4000);}));
    await Promise.all(pending);
    await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  }

  async function exportCurrentPdf(){
    if(!state.currentPath||!window.lumaDesktop?.exportPdf){showToast(t("pdfUnavailable"));return;}
    if(state.editing){showEditingBlockedNotice();return;}
    const previousView=state.view;
    if(previousView!=="rendered")setView("rendered");
    const button=$("#export-pdf");
    document.body.classList.add("pdf-exporting");button.disabled=true;showToast(t("exportingPdf"));
    try{
      await waitForPdfAssets();
      const result=await window.lumaDesktop.exportPdf({name:state.currentName||state.currentPath});
      if(result?.ok)showToast(t("pdfExported"));
      else if(!result?.canceled)showToast(result?.message||t("pdfExportFailed"));
    }catch(error){showToast(error.message||t("pdfExportFailed"));}
    finally{document.body.classList.remove("pdf-exporting");button.disabled=false;if(previousView!=="rendered")setView(previousView);}
  }

  function applyLanguage(language) {
    state.language = translations[language] ? language : "en";
    localStorage.setItem("lumareader-language", state.language);
    persistPreferences({language:state.language});
    document.documentElement.lang = state.language;
    languageEl.value = state.language;
    languageNameEl.textContent = languageEl.selectedOptions[0]?.textContent || "English";
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => { const value=t(el.dataset.i18nTitle); el.title=value; if(el.matches("button")) el.setAttribute("aria-label",value); });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label",t(el.dataset.i18nAria)));
    pagedNavigationEl.setAttribute("aria-label",t("pageNavigation"));pagePreviousEl.setAttribute("aria-label",t("previousPage"));pageNextEl.setAttribute("aria-label",t("nextPage"));
    updateImageViewerLabels();updateThemeButton();updateEditorControls();updateToolbarTooltips();renderReadingModeMenu();renderPaletteMenu();renderLanguageMenu();buildOutline();rebuildMedia();renderTree();updateLibraryDisplay();updateNewMarkdownDialog();updateSidebarToggle();if(state.libraryScanTimer)renderLibraryScanStatus();else if(!state.currentPath)renderLibraryPrompt();
  }

  function folderName(value){return String(value||"").split(/[\\/]/).filter(Boolean).pop()||t("noLibraryShort");}
  function updateCreateAvailability(){newMarkdownButtonEl.disabled=state.creatingDocument||state.choosingCreateDirectory||!window.lumaDesktop?.chooseCreateDirectory||!window.lumaDesktop?.createDocument;}
  function updateLibraryDisplay(){const label=window.lumaWeb?(webSessionLabels[state.language]||webSessionLabels.en):(state.libraryRoot?folderName(state.libraryRoot):t("noLibraryShort"));if(libraryRootEl){libraryRootEl.textContent=label;libraryRootEl.title=label;}updateCreateAvailability();}
  function formatTemplate(key,values={}){return Object.entries(values).reduce((copy,[name,value])=>copy.replaceAll(`{${name}}`,String(value)),t(key));}
  function currentDirectoryPath(){if(state.sourceType!=="project"||!state.currentPath)return"";const parts=state.currentPath.split("/");parts.pop();return parts.join("/");}
  function currentDirectoryLabel(directory=state.createDirectory){if(window.lumaWeb)return webSessionLabels[state.language]||webSessionLabels.en;if(state.createDirectoryPath)return state.createDirectoryPath;const root=folderName(state.libraryRoot);return directory?`${root} / ${directory}`:root;}
  function markdownPreviewName(){const value=newMarkdownNameEl.value.trim();if(!value)return"";return value.toLowerCase().endsWith(".md")?value:`${value}.md`;}
  function updateNewMarkdownDialog(){
    $("#new-markdown-title").textContent=t("createMarkdownTitle");$("#new-markdown-copy").textContent=t("createMarkdownCopy");$("#new-markdown-name-label").textContent=t("documentName");$("#new-markdown-destination-label").textContent=t("currentFolder");$("#new-markdown-cancel").textContent=t("cancel");newMarkdownCreateEl.textContent=t("create");
    const previewName=markdownPreviewName(),destination=currentDirectoryLabel();newMarkdownSuffixEl.hidden=newMarkdownNameEl.value.trim().toLowerCase().endsWith(".md");newMarkdownDestinationEl.textContent=destination;newMarkdownDestinationEl.title=state.createDirectoryPath||state.libraryRoot||"";newMarkdownConfirmationEl.textContent=previewName?formatTemplate("createMarkdownQuestion",{name:previewName,folder:destination}):"";newMarkdownCreateEl.disabled=state.creatingDocument||!previewName;updateCreateAvailability();
  }
  function showNewMarkdownError(message){newMarkdownErrorEl.textContent=message;newMarkdownErrorEl.hidden=!message;}
  async function openNewMarkdownDialog(){
    if(blockWhileEditing()||state.choosingCreateDirectory)return;if(!window.lumaDesktop?.chooseCreateDirectory){showToast(t("folderSelectionUnavailable"));return;}
    state.choosingCreateDirectory=true;updateCreateAvailability();
    try{
      const destination=await window.lumaDesktop.chooseCreateDirectory({directory:currentDirectoryPath()});
      if(!destination?.selected||destination.canceled)return;
      state.createDirectory=destination.directory||"";state.createDirectoryPath=destination.displayPath||destination.root||"";state.createDestinationToken=destination.destinationToken||"";newMarkdownNameEl.value="";showNewMarkdownError("");updateNewMarkdownDialog();if(!newMarkdownDialogEl.open)newMarkdownDialogEl.showModal();requestAnimationFrame(()=>newMarkdownNameEl.focus());
    }catch(error){showToast(error?.message||t("createFailed"));}
    finally{state.choosingCreateDirectory=false;updateCreateAvailability();}
  }
  function clearCreateDestination(){if(state.createDestinationToken)window.lumaDesktop?.cancelCreateDocument?.(state.createDestinationToken).catch(()=>{});state.createDestinationToken="";state.createDirectory="";state.createDirectoryPath="";}
  function closeNewMarkdownDialog(){if(state.creatingDocument)return;clearCreateDestination();if(newMarkdownDialogEl.open)newMarkdownDialogEl.close();newMarkdownButtonEl.focus();}
  function revealCreatedDocument(document){
    searchEl.value="";state.files=state.files.filter((file)=>file.path!==document.path);state.files.push(document);const parts=document.path.split("/");parts.pop();let folder="";for(const part of parts){folder=folder?`${folder}/${part}`:part;state.openFolders.add(folder);}renderTree();
  }
  async function createMarkdownDocument(event){
    event.preventDefault();if(state.creatingDocument)return;const name=newMarkdownNameEl.value.trim();if(!name){showNewMarkdownError(t("nameRequired"));newMarkdownNameEl.focus();return;}
    state.creatingDocument=true;showNewMarkdownError("");updateNewMarkdownDialog();
    try{
      const result=await window.lumaDesktop.createDocument({destinationToken:state.createDestinationToken,name});
      if(!result?.ok){if(result?.code==="SESSION_DOCUMENT_LIMIT"){if(newMarkdownDialogEl.open)newMarkdownDialogEl.close();await loadFiles({showProgress:true});openSessionLimitDialog();return;}showNewMarkdownError(result?.code==="DOCUMENT_ALREADY_EXISTS"?t("documentExists"):(result?.message||t("createFailed")));return;}
      const libraryChanged=state.libraryRoot!==result.root;state.libraryRoot=result.root||state.libraryRoot;if(libraryChanged)state.openFolders.clear();state.createDestinationToken="";cancelDocumentRequest();try{await loadFiles({showProgress:true});}catch(error){console.warn("Unable to refresh the library after creating a document",error);}revealCreatedDocument(result.document);if(newMarkdownDialogEl.open)newMarkdownDialogEl.close();state.createDirectory="";state.createDirectoryPath="";await consumePayload(result.document,{requestId:state.documentRequestId});beginEditing();showToast(t("documentCreated"));
    }catch(error){showNewMarkdownError(error?.message||t("createFailed"));}
    finally{state.creatingDocument=false;updateNewMarkdownDialog();}
  }
  function isNarrow(){return matchMedia("(max-width: 820px)").matches;}
  function clampSidebarWidth(value){return Math.round(Math.max(240,Math.min(520,Math.min(innerWidth-360,Number(value)||320))));}
  function applySidebarWidth(width,{save=false}={}){state.sidebarWidth=clampSidebarWidth(width);document.documentElement.style.setProperty("--sidebar-width",`${state.sidebarWidth}px`);sidebarResizerEl.setAttribute("aria-valuemin","240");sidebarResizerEl.setAttribute("aria-valuemax",String(clampSidebarWidth(520)));sidebarResizerEl.setAttribute("aria-valuenow",String(state.sidebarWidth));if(save){localStorage.setItem("lumareader-sidebar-width",String(state.sidebarWidth));persistPreferences({sidebarWidth:state.sidebarWidth});}}
  function updateSidebarToggle(){const collapsed=isNarrow()?!sidebarEl.classList.contains("open"):state.sidebarCollapsed;const label=t(collapsed?"expandSidebar":"collapseSidebar");sidebarToggleEl.textContent=collapsed?"☰":"‹";sidebarToggleEl.title=label;sidebarToggleEl.setAttribute("aria-label",label);sidebarToggleEl.setAttribute("aria-expanded",collapsed?"false":"true");document.body.classList.toggle("sidebar-collapsed",!isNarrow()&&state.sidebarCollapsed);}
  function captureReadingPosition(){
    if(state.editing)return{ratio:readingRatio()};
    if(state.activeAdapter)return{ratio:readingRatio()};
    const blocks=[...contentEl.children];if(!blocks.length)return{ratio:readingRatio()};
    const horizontal=!usesVerticalAxis();const boundary=horizontal?contentEl.getBoundingClientRect().left+12:Math.max(0,$(".reader-bar")?.getBoundingClientRect().bottom||0)+12;
    let index=blocks.findIndex((block)=>{const rect=block.getBoundingClientRect();return horizontal?rect.right>=boundary:rect.bottom>=boundary;});if(index<0)index=blocks.length-1;
    const block=blocks[index];return{blockId:block.id||"",index,ratio:readingRatio()};
  }
  function restoreReadingPosition(position){
    if(!position||typeof position==="number"){restoreReadingRatio(Number(position)||0);return;}
    if(state.activeAdapter){restoreReadingRatio(position.ratio||0);return;}
    const block=(position.blockId&&document.getElementById(position.blockId))||contentEl.children[position.index];
    if(!block){restoreReadingRatio(position.ratio||0);return;}
    if(state.mode==="vertical")block.scrollIntoView({block:"start",behavior:"auto"});else if(usesVerticalAxis())contentEl.scrollTop=Math.max(0,block.offsetTop-parseFloat(getComputedStyle(contentEl).paddingTop||0));else contentEl.scrollLeft=Math.max(0,block.offsetLeft-parseFloat(getComputedStyle(contentEl).paddingLeft||0));
    updatePagination();
  }
  function scheduleLayoutRefresh(position=captureReadingPosition()){requestAnimationFrame(()=>{updatePagination();clearTimeout(scheduleLayoutRefresh.timer);scheduleLayoutRefresh.timer=setTimeout(()=>{restoreReadingPosition(position);if(editorPreviewIsActive())scheduleEditorScrollMapRefresh();},240);});}
  function toggleSidebar(){const position=captureReadingPosition();if(isNarrow()){sidebarEl.classList.toggle("open");document.body.classList.toggle("sidebar-open",sidebarEl.classList.contains("open"));}else{state.sidebarCollapsed=!state.sidebarCollapsed;localStorage.setItem("lumareader-sidebar-collapsed",String(state.sidebarCollapsed));persistPreferences({sidebarCollapsed:state.sidebarCollapsed});}updateSidebarToggle();scheduleLayoutRefresh(position);}
  function closeSidebarOnNarrow(){if(!isNarrow())return;sidebarEl.classList.remove("open");document.body.classList.remove("sidebar-open");updateSidebarToggle();}
  function disposeActiveAdapter(){state.activeAdapter?.dispose?.();state.activeAdapter=null;contentEl.classList.add("prose");contentEl.classList.remove("adapter-content");document.body.removeAttribute("data-document-kind");}
  function renderLibraryPrompt(){
    contentEl.replaceChildren();contentEl.classList.remove("library-scanning-active");
    const button=document.createElement("button");button.type="button";button.className="root-folder-prompt";button.setAttribute("aria-label",t(window.lumaWeb?"chooseFile":"changeLibrary"));
    const icon=document.createElement("span");icon.className="root-folder-prompt-icon";icon.setAttribute("aria-hidden","true");icon.textContent=window.lumaWeb?"↓":"▰";
    const heading=document.createElement("strong");heading.textContent=window.lumaWeb?t("dropTitle"):t(state.libraryRoot?"noSupportedFiles":"noLibrary");
    const copy=document.createElement("span");copy.textContent=window.lumaWeb?t("dropCopy"):t(state.libraryRoot?"chooseAnotherRoot":"rootFolderHint");
    button.append(icon,heading,copy);contentEl.classList.add("library-prompt-active");contentEl.appendChild(button);
  }
  function scanCopy(key,seconds){return t(key).replace("{seconds}",String(seconds));}
  function renderLibraryScanStatus(seconds=Math.max(0,Math.floor((Date.now()-state.libraryScanStartedAt)/1000))){const label=scanCopy("scanning",seconds);pathEl.textContent=label;if(state.currentPath)return;contentEl.replaceChildren();contentEl.classList.remove("library-prompt-active");contentEl.classList.add("library-scanning-active");const section=document.createElement("section");section.className="library-scan-status";const spinner=document.createElement("span");spinner.className="library-scan-spinner";spinner.setAttribute("aria-hidden","true");const heading=document.createElement("strong");heading.textContent=label;const copy=document.createElement("span");copy.textContent=t(seconds>10?"scanEstimateLong":"scanEstimate");section.append(spinner,heading,copy);contentEl.appendChild(section);}
  function startLibraryScan(){const scanId=++state.libraryScanId;clearInterval(state.libraryScanTimer);state.libraryScanStartedAt=Date.now();document.body.classList.add("scanning-library");renderLibraryScanStatus(0);state.libraryScanTimer=setInterval(()=>{if(scanId===state.libraryScanId)renderLibraryScanStatus();},250);return scanId;}
  function stopLibraryScan(scanId){if(scanId!==state.libraryScanId)return;clearInterval(state.libraryScanTimer);state.libraryScanTimer=null;document.body.classList.remove("scanning-library");contentEl.classList.remove("library-scanning-active");pathEl.textContent=state.currentPath||t("ready");}
  function cancelDocumentRequest(){state.documentRequestId+=1;state.documentAbortController?.abort();state.documentAbortController=null;setLoading(false);}
  function showEmptyLibrary(){stopLiveRefresh();disposeActiveAdapter();resetEditorState();state.currentPath="";state.currentSource="";state.rawText="";state.renderText="";state.documentKind="markdown";cancelDocumentRequest();nameEl.textContent="Kainnne LumaReader";pathEl.textContent=t("ready");contentEl.hidden=false;rawEl.hidden=true;shellEl.dataset.view="rendered";renderLibraryPrompt();rawEl.querySelector("code").textContent="";buildOutline();rebuildMedia();updateEditorControls();}

  function showUnsupportedDocument(name,extension,message){
    stopLiveRefresh();disposeActiveAdapter();resetEditorState();contentEl.classList.remove("library-prompt-active");state.currentPath=name||"";state.currentName=name||"Unsupported file";state.documentKind="unsupported";
    nameEl.textContent=state.currentName;pathEl.textContent=extension?`${extension.toUpperCase()} · Unsupported preview format`:"Unsupported preview format";
    contentEl.replaceChildren();const section=document.createElement("section");section.className="document-message unsupported-document";
    const badge=document.createElement("span");badge.className="document-message-badge";badge.textContent=extension?extension.slice(1).toUpperCase():"FILE";
    const heading=document.createElement("h2");heading.textContent="This file is not available in Preview";
    const copy=document.createElement("p");copy.textContent=message||"LumaReader keeps this format disabled so the file cannot execute or alter local content.";
    section.append(badge,heading,copy);contentEl.appendChild(section);rawEl.hidden=true;contentEl.hidden=false;setView("rendered");
  }

  function updateToolbarCapabilities(kind,capabilities={}){
    const markdown=kind==="markdown";const sourceButton=$("#source-view");
    sourceButton.hidden=!(markdown||capabilities.source||capabilities.raw);
    $("#media-view").hidden=!(markdown&&capabilities.media!==false);
    const paged=markdown||Boolean(capabilities.paged);
    readingModeControlEl.hidden=!paged;
    updateEditorControls();
  }

  function canEditCurrentDocument(){return Boolean(window.lumaDesktop?.saveDocument&&state.sourceType==="project"&&state.documentKind==="markdown"&&isMarkdown(state.currentPath));}
  function editorPreviewIsActive(){return state.editing&&state.view==="source"&&state.editorPreview;}
  function applyEditorSplitRatio(ratio=state.editorSplitRatio,{save=false}={}){state.editorSplitRatio=Math.max(.25,Math.min(.75,Number(ratio)||.5));document.documentElement.style.setProperty("--editor-source-size",`${(state.editorSplitRatio*100).toFixed(2)}%`);const stacked=matchMedia("(max-width: 820px)").matches;editorPreviewResizerEl.setAttribute("aria-orientation",stacked?"horizontal":"vertical");editorPreviewResizerEl.setAttribute("aria-valuenow",String(Math.round(state.editorSplitRatio*100)));if(save){localStorage.setItem("lumareader-editor-split",String(state.editorSplitRatio));persistPreferences({editorSplitRatio:state.editorSplitRatio});}}
  function scrollRatioFor(element){const max=Math.max(0,element.scrollHeight-element.clientHeight);return max?element.scrollTop/max:0;}
  function editorScrollEndTolerance(element){const lineHeight=parseFloat(getComputedStyle(element).lineHeight)||state.fontSize*1.65;return Math.max(2,Math.min(12,lineHeight*.25));}
  function updateEditorPreviewEndAction(){
    editorPreviewEndEl.hidden=!editorPreviewIsActive()||!window.LumaReaderUtils.shouldOfferPreviewEnd(sourceEditorEl,contentEl,editorScrollEndTolerance(sourceEditorEl),editorScrollEndTolerance(contentEl));
  }
  function showEditorPreviewEnd(){
    if(!editorPreviewIsActive())return;const alignEnds=()=>{sourceEditorEl.scrollTop=Math.max(0,sourceEditorEl.scrollHeight-sourceEditorEl.clientHeight);contentEl.scrollTop=Math.max(0,contentEl.scrollHeight-contentEl.clientHeight);};cancelAnimationFrame(state.editorScrollFrame);state.editorScrollSyncing="source";alignEnds();state.editorScrollFrame=requestAnimationFrame(()=>{editorPreviewEndEl.focus({preventScroll:true});alignEnds();state.editorScrollFrame=requestAnimationFrame(()=>{editorPreviewEndEl.blur();state.editorScrollSyncing=false;updateEditorPreviewEndAction();});});
  }
  function assignEditorPreviewBlocks(parsedText){
    const starts=window.LumaReaderUtils.markdownTokenLineStarts(window.marked.lexer(parsedText,{gfm:true,breaks:false}));const blocks=[...contentEl.children];
    state.editorPreviewBlocks=blocks.map((element,index)=>{const sourceIndex=blocks.length===starts.length?index:(blocks.length<=1?0:Math.round(index*Math.max(0,starts.length-1)/Math.max(1,blocks.length-1)));return{element,line:starts[sourceIndex]??0};});
  }
  function rebuildEditorScrollMap(){
    if(!editorPreviewIsActive())return;const sourceMax=Math.max(0,sourceEditorEl.scrollHeight-sourceEditorEl.clientHeight),previewMax=Math.max(0,contentEl.scrollHeight-contentEl.clientHeight);const sourceStyle=getComputedStyle(sourceEditorEl),lineHeight=parseFloat(sourceStyle.lineHeight)||state.fontSize*1.65,previewPadding=parseFloat(getComputedStyle(contentEl).paddingTop)||0,previewRect=contentEl.getBoundingClientRect();const anchors=[[0,0]];
    state.editorPreviewBlocks.forEach(({element,line})=>{if(!element?.isConnected)return;const sourcePosition=Math.max(0,Math.min(sourceMax,line*lineHeight)),previewPosition=Math.max(0,Math.min(previewMax,element.getBoundingClientRect().top-previewRect.top+contentEl.scrollTop-previewPadding));const previous=anchors.at(-1);if(sourcePosition<=previous[0]||previewPosition<=previous[1])return;anchors.push([sourcePosition,previewPosition]);});
    const previous=anchors.at(-1);if(sourceMax>previous[0]||previewMax>previous[1])anchors.push([sourceMax,previewMax]);state.editorSourceToPreview=anchors;state.editorPreviewToSource=anchors.map(([source,preview])=>[preview,source]);
  }
  function scheduleEditorScrollMapRefresh({sync=true}={}){cancelAnimationFrame(state.editorScrollMapFrame);state.editorScrollMapFrame=requestAnimationFrame(()=>{state.editorScrollMapFrame=null;if(!editorPreviewIsActive())return;rebuildEditorScrollMap();if(sync)syncEditorPreviewFromSource();else updateEditorPreviewEndAction();});}
  function syncEditorPreviewFromSource(){if(!editorPreviewIsActive()||state.editorScrollSyncing==="preview")return;cancelAnimationFrame(state.editorScrollFrame);state.editorScrollFrame=requestAnimationFrame(()=>{if(!editorPreviewIsActive())return;state.editorScrollSyncing="source";const previewMax=Math.max(0,contentEl.scrollHeight-contentEl.clientHeight),fallback=previewMax*scrollRatioFor(sourceEditorEl);contentEl.scrollTop=state.editorSourceToPreview.length>1?window.LumaReaderUtils.mapByAnchors(sourceEditorEl.scrollTop,state.editorSourceToPreview):fallback;state.editorScrollFrame=requestAnimationFrame(()=>{state.editorScrollSyncing=false;updateEditorPreviewEndAction();});});}
  function syncEditorSourceFromPreview(){if(!editorPreviewIsActive()||state.editorScrollSyncing)return;state.editorScrollSyncing="preview";const sourceMax=Math.max(0,sourceEditorEl.scrollHeight-sourceEditorEl.clientHeight),fallback=sourceMax*scrollRatioFor(contentEl);sourceEditorEl.scrollTop=state.editorPreviewToSource.length>1?window.LumaReaderUtils.mapByAnchors(contentEl.scrollTop,state.editorPreviewToSource):fallback;state.editorScrollFrame=requestAnimationFrame(()=>{state.editorScrollSyncing=false;syncEditorPreviewFromSource();});}
  async function renderEditorPreview(){if(!editorPreviewIsActive())return;await renderDocument(false,state.documentRequestId,sourceEditorEl.value);if(editorPreviewIsActive()){contentEl.hidden=false;scheduleEditorScrollMapRefresh();}}
  function scheduleEditorPreview(immediate=false){clearTimeout(state.editorPreviewTimer);if(!editorPreviewIsActive())return;state.editorPreviewTimer=setTimeout(()=>renderEditorPreview().catch((error)=>console.warn("Unable to render the editor preview",error)),immediate?0:180);}
  function updateEditorPreviewLayout({render=false}={}){
    const active=editorPreviewIsActive();editorPreviewControlEl.hidden=!state.editing;editorPreviewToggleEl.checked=state.editorPreview;editorPreviewToggleEl.disabled=state.saving;editorPreviewResizerEl.hidden=!active;editorPreviewEndEl.hidden=true;document.body.classList.toggle("editor-preview-enabled",active);applyEditorSplitRatio();
    if(active)contentEl.setAttribute("aria-label",t("comparisonPreview"));else contentEl.removeAttribute("aria-label");
    if(state.view==="source")contentEl.hidden=!active;if(render&&active)scheduleEditorPreview(true);
  }
  function updateEditorControls(){
    const editButton=$("#edit-document"),cancelButton=$("#cancel-edit"),label=$("#edit-document-label"),icon=$("#edit-document-icon"),editable=canEditCurrentDocument();
    editButton.hidden=!editable&&!state.editing;
    editButton.disabled=state.saving;
    editButton.classList.toggle("is-editing",state.editing);
    editButton.classList.toggle("is-dirty",state.editing&&state.editorDirty);
    const editKey=state.editing?(state.editorSaved&&!state.editorDirty?"saved":"save"):"edit";
    editButton.dataset.tooltipKey=editKey;
    label.textContent=t(editKey);
    icon.textContent=state.editing?"✓":"✎";
    editButton.setAttribute("aria-label",t(editKey));
    cancelButton.hidden=!state.editing;
    cancelButton.disabled=state.saving;
    const exitKey=state.editorDirty?"discardEdits":"exitEdit";
    cancelButton.dataset.tooltipKey=exitKey;
    cancelButton.setAttribute("aria-label",t(exitKey));
    const sourceButton=$("#source-view");
    sourceButton.setAttribute("aria-disabled",state.editing?"true":"false");
    shareButtonEl.hidden=!state.currentPath||!isMarkdown(state.currentPath);
    shareButtonEl.disabled=state.saving;
    document.body.classList.toggle("editing-document",state.editing);
    updateEditorPreviewLayout();
    updateToolbarTooltips();
  }
  function resetEditorState(){clearTimeout(state.editorPreviewTimer);cancelAnimationFrame(state.editorScrollFrame);cancelAnimationFrame(state.editorScrollMapFrame);state.editorPreviewTimer=null;state.editorScrollFrame=null;state.editorScrollMapFrame=null;state.editorScrollSyncing=false;state.editorPreviewBlocks=[];state.editorSourceToPreview=[];state.editorPreviewToSource=[];state.editing=false;state.editorDirty=false;state.editorSaved=false;state.saving=false;sourceEditorEl.value="";sourceEditorEl.hidden=true;editorPreviewControlEl.hidden=true;editorPreviewResizerEl.hidden=true;document.body.classList.remove("editing-document","editor-preview-enabled");contentEl.removeAttribute("aria-label");if($("#toast")?.dataset.tone==="editing")hideToast();}
  function blockWhileEditing(){if(!state.editing)return false;showEditingBlockedNotice();return true;}
  function beginEditing(){
    if(!canEditCurrentDocument()){showToast(t("editUnavailable"));return;}
    stopLiveRefresh();state.editing=true;state.editorDirty=false;state.editorSaved=false;sourceEditorEl.value=state.rawText;pathEl.textContent=t("editing");updateEditorControls();setView("source");updateEditorPreviewLayout({render:true});
    requestAnimationFrame(()=>{sourceEditorEl.focus();sourceEditorEl.setSelectionRange(0,0);});
  }
  async function leaveEditing({discarded=false}={}){const hadChanges=state.editorDirty;resetEditorState();updateEditorControls();pathEl.textContent=state.currentPath||t("ready");setView("rendered");if(state.documentKind==="markdown")await renderDocument(false);startLiveRefresh();if(discarded&&hadChanges)showToast(t("discarded"));}
  async function saveEditing(){
    if(!state.editing){showToast(t("editUnavailable"));return;}
    if(state.saving)return;
    if(!state.editorDirty){state.editorSaved=true;pathEl.textContent=t("saved");updateEditorControls();showToast(t("saved"));return;}
    state.saving=true;updateEditorControls();
    try{
      const result=await window.lumaDesktop.saveDocument({path:state.currentPath,text:sourceEditorEl.value,expectedModifiedNs:state.modifiedNs});
      if(!result?.ok){showToast(result?.code==="DOCUMENT_CHANGED"?t("changedExternally"):(result?.message||t("saveFailed")));return;}
      state.rawText=result.document.text||"";state.renderText=result.document.renderText||result.document.text||"";state.modifiedNs=result.document.modifiedNs??state.modifiedNs;state.currentBase=result.document.base||state.currentBase;
      rawEl.querySelector("code").textContent=state.rawText;state.editorDirty=false;state.editorSaved=true;pathEl.textContent=t("saved");
      showToast(t(result.sessionOnly?"sessionSaved":"saved"));
    }catch(error){showToast(error?.message||t("saveFailed"));}
    finally{state.saving=false;updateEditorControls();}
  }

  function openShareDialog(result){shareLinkOutputEl.value=result.url;shareDialogCopyEl.textContent=t(result.canonical?"shareDialogCanonical":result.shortened?"shareDialogCopy":"shareDialogFallback");if(!shareDialogEl.open)shareDialogEl.showModal();requestAnimationFrame(()=>$("#share-link-copy").focus());}
  function closeShareDialog(){if(shareDialogEl.open)shareDialogEl.close();shareLinkOutputEl.value="";shareButtonEl.focus();}
  async function shareCurrentMarkdown(){
    if(!state.currentPath||!isMarkdown(state.currentPath)||!window.lumaWeb?.createShareUrl){showToast(t("shareUnavailable"));return;}
    const text=state.editing?sourceEditorEl.value:state.rawText;
    shareButtonEl.disabled=true;shareButtonEl.setAttribute("aria-busy","true");
    try{
      const result=await window.lumaWeb.createShareUrl({name:state.currentName||state.currentPath.split("/").pop(),text});
      if(!result?.ok){showToast(t(result?.code==="SHARE_TOO_LARGE"?"shareTooLarge":"shareFailed"));return;}
      openShareDialog(result);
    }catch(error){console.warn("Unable to share Markdown",error);showToast(t("shareFailed"));}
    finally{shareButtonEl.disabled=false;shareButtonEl.removeAttribute("aria-busy");}
  }
  async function copyShareLink(){
    const url=shareLinkOutputEl.value;if(!url)return;
    try{await navigator.clipboard.writeText(url);closeShareDialog();showToast(t("shareCopied"));}
    catch(error){console.warn("Unable to copy share link",error);shareLinkOutputEl.focus();shareLinkOutputEl.select();showToast(t("shareFailed"));}
  }

  async function sourceFromPayload(data){
    const url=data.contentUrl||data.content?.url||"";
    return {
      name:data.name,path:data.path,kind:data.kind,extension:data.extension||data.ext,mime:data.mime,
      text:data.renderText||data.text||null,url,
      data:data.uploadedFile?async()=>data.uploadedFile.arrayBuffer():url?async()=>{const response=await fetch(url,{cache:"no-store"});if(!response.ok)throw new Error(`Unable to read binary content (${response.status})`);return response.arrayBuffer();}:null,
      meta:data,
    };
  }

  async function renderAdapterPayload(data,requestId=state.documentRequestId){
    disposeActiveAdapter();const source=await sourceFromPayload(data);
    const options={PlainTextAdapter:{pageSize:70}};
    const adapter=window.LumaDocumentAdapters?.createAdapterFor?.(source,options);
    if(!adapter)throw new Error(`No safe preview adapter is available for ${data.extension||data.kind}.`);
    state.activeAdapter=adapter;contentEl.classList.remove("prose");contentEl.classList.add("adapter-content");document.body.dataset.documentKind=data.kind;
    await adapter.loadDocument(source);
    if(requestId!==state.documentRequestId){adapter.dispose?.();if(state.activeAdapter===adapter)state.activeAdapter=null;return false;}
    await adapter.renderDocument(contentEl,{
      mode:state.mode,
      onPageChange:(page)=>{if(requestId!==state.documentRequestId||state.activeAdapter!==adapter)return;state.activeAdapter.currentPage=page;updatePagination();},
      onPageModelChange:(model)=>{if(requestId!==state.documentRequestId||state.activeAdapter!==adapter)return;if(Number.isFinite(model?.current))state.activeAdapter.currentPage=model.current;updatePagination();},
      onLayoutChange:()=>{if(requestId===state.documentRequestId&&state.activeAdapter===adapter)scheduleLayoutRefresh(readingRatio());},
    });
    if(requestId!==state.documentRequestId||state.activeAdapter!==adapter){adapter.dispose?.();return false;}
    rawEl.querySelector("code").textContent=data.text||"";outlineEl.replaceChildren();const empty=document.createElement("p");empty.className="sidebar-empty";empty.textContent=t("noOutline");outlineEl.appendChild(empty);
    state.media=[];mediaGridEl.replaceChildren();updateToolbarCapabilities(data.kind,data.capabilities||{});requestAnimationFrame(updatePagination);
    return true;
  }

  const readingModeIcons={vertical:"↕",horizontal:"↔","paged-horizontal":"▤","paged-vertical":"▥"};
  function currentReadingLayout(){return state.mode==="paged"?`paged-${state.pagedDirection}`:state.mode;}
  function usesVerticalAxis(){return state.mode==="vertical"||(state.mode==="paged"&&state.pagedDirection==="vertical");}

  function dropdownPairs(){return[[readingModeMenuEl,readingModeToggleEl],[paletteMenuEl,paletteToggleEl],[languageMenuEl,languageToggleEl]];}
  function positionToolbarMenu(menu,toggle){
    const rect=toggle.getBoundingClientRect();
    menu.style.visibility="hidden";menu.hidden=false;
    const width=menu.offsetWidth,height=Math.min(menu.scrollHeight,innerHeight-16);
    const left=Math.max(8,Math.min(innerWidth-width-8,rect.left));
    const below=rect.bottom+8,top=below+height<=innerHeight-8?below:Math.max(8,rect.top-height-8);
    menu.style.left=`${left}px`;menu.style.top=`${top}px`;menu.style.maxHeight=`${Math.max(120,innerHeight-top-8)}px`;menu.style.visibility="";
  }
  function closeToolbarMenu(menu,toggle,{focus=false}={}){menu.hidden=true;toggle.setAttribute("aria-expanded","false");toggle.classList.remove("active");if(focus)toggle.focus();}
  function closeToolbarMenus(except=null){dropdownPairs().forEach(([menu,toggle])=>{if(menu!==except)closeToolbarMenu(menu,toggle);});}
  function openToolbarMenu(menu,toggle){closeToolbarMenus(menu);positionToolbarMenu(menu,toggle);toggle.setAttribute("aria-expanded","true");toggle.classList.add("active");}
  function toggleToolbarMenu(menu,toggle){if(menu.hidden)openToolbarMenu(menu,toggle);else closeToolbarMenu(menu,toggle);}

  function renderReadingModeMenu(){
    readingModeMenuEl.replaceChildren();
    const selected=currentReadingLayout();
    ["vertical","horizontal","paged-horizontal","paged-vertical"].forEach((layout)=>{
      const labelKey=layout==="paged-horizontal"?"pagedHorizontal":layout==="paged-vertical"?"pagedVertical":layout;
      const button=document.createElement("button");button.type="button";button.className="toolbar-menu-option";button.setAttribute("role","menuitemradio");button.setAttribute("aria-checked",layout===selected?"true":"false");
      button.innerHTML=`<span class="menu-option-icon" aria-hidden="true">${readingModeIcons[layout]}</span><span>${escapeHtml(t(labelKey))}</span><b aria-hidden="true">${layout===selected?"✓":""}</b>`;
      button.addEventListener("click",()=>{setMode(layout);closeToolbarMenu(readingModeMenuEl,readingModeToggleEl,{focus:true});});readingModeMenuEl.appendChild(button);
    });
    const labelKey=selected==="paged-horizontal"?"pagedHorizontal":selected==="paged-vertical"?"pagedVertical":selected;
    readingModeNameEl.textContent=selected==="paged-horizontal"?`${t("paged")} →`:selected==="paged-vertical"?`${t("paged")} ↓`:t(labelKey);readingModeIconEl.textContent=readingModeIcons[selected];
  }

  function renderLanguageMenu(){
    languageMenuEl.replaceChildren();
    [...languageEl.options].forEach((option)=>{
      const button=document.createElement("button");button.type="button";button.className="toolbar-menu-option";button.setAttribute("role","menuitemradio");button.setAttribute("lang",option.value);button.setAttribute("aria-checked",option.value===state.language?"true":"false");
      button.innerHTML=`<span class="menu-option-icon language-code" aria-hidden="true">${escapeHtml(option.value.split("-")[0].toUpperCase())}</span><span>${escapeHtml(option.textContent)}</span><b aria-hidden="true">${option.value===state.language?"✓":""}</b>`;
      button.addEventListener("click",()=>{applyLanguage(option.value);closeToolbarMenu(languageMenuEl,languageToggleEl,{focus:true});});languageMenuEl.appendChild(button);
    });
    languageNameEl.textContent=languageEl.selectedOptions[0]?.textContent||"English";
  }

  function renderPaletteMenu() {
    paletteMenuEl.innerHTML = "";
    palettes.forEach((palette) => {
      const button=document.createElement("button"); button.type="button"; button.className="toolbar-menu-option palette-option"; button.setAttribute("role","menuitemradio");
      button.setAttribute("aria-checked",palette.id===state.palette?"true":"false"); button.dataset.palette=palette.id;
      const swatches=palette.colors.map((color)=>`<i style="--swatch:${color}"></i>`).join("");
      button.innerHTML=`<span class="palette-swatch">${swatches}</span><span>${escapeHtml(paletteLabel(palette))}</span><b aria-hidden="true">${palette.id===state.palette?"✓":""}</b>`;
      button.addEventListener("click",()=>{applyPalette(palette.id,true);closeToolbarMenu(paletteMenuEl,paletteToggleEl,{focus:true});});paletteMenuEl.appendChild(button);
    });
    const selected=palettes.find((item)=>item.id===state.palette)||palettes[0]; paletteNameEl.textContent=paletteLabel(selected);
    const swatch=$("#palette-swatch"); swatch.innerHTML=selected.colors.map((color)=>`<i style="--swatch:${color}"></i>`).join("");
  }

  function applyPalette(palette, rerender=false) {
    state.palette=palettes.some((item)=>item.id===palette)?palette:"dream-rose";
    document.documentElement.dataset.palette=state.palette; localStorage.setItem("lumareader-palette",state.palette); persistPreferences({palette:state.palette}); renderPaletteMenu();
    if(rerender&&state.renderText&&state.documentKind==="markdown"){if(editorPreviewIsActive())scheduleEditorPreview(true);else renderDocument(true);}
  }
  function openPalette(){openToolbarMenu(paletteMenuEl,paletteToggleEl);}
  function closePalette(){closeToolbarMenu(paletteMenuEl,paletteToggleEl);}

  function updateThemeButton(){ const dark=document.documentElement.classList.contains("dark"),label=t(dark?"lightMode":"darkMode"); themeEl.textContent=dark?"☀":"◐"; themeEl.dataset.i18nTitle=dark?"lightMode":"darkMode"; themeEl.removeAttribute("title"); themeEl.setAttribute("aria-label",label); themeEl.classList.toggle("active",dark); $("#highlight-light").disabled=dark; $("#highlight-dark").disabled=!dark; }
  function toggleTheme(){ const dark=document.documentElement.classList.toggle("dark"); localStorage.setItem("lumareader-theme",dark?"dark":"light"); persistPreferences({theme:dark?"dark":"light"}); updateThemeButton(); if(state.renderText&&state.documentKind==="markdown"){if(editorPreviewIsActive())scheduleEditorPreview(true);else renderDocument(true);} }

  function hideToast(){const toast=$("#toast");toast.hidden=true;delete toast.dataset.tone;document.body.classList.remove("editor-blocked-hint");}
  function showToast(message){const toast=$("#toast");toast.replaceChildren();toast.textContent=message;delete toast.dataset.tone;toast.hidden=false;document.body.classList.remove("editor-blocked-hint");clearTimeout(showToast.timer);showToast.timer=setTimeout(hideToast,2200);}
  function showEditingBlockedNotice(){
    const toast=$("#toast"),icon=document.createElement("span"),copy=document.createElement("span"),title=document.createElement("strong"),detail=document.createElement("span");icon.className="toast-notice-icon";icon.setAttribute("aria-hidden","true");icon.textContent="✎";copy.className="toast-notice-copy";title.textContent=t("editingBlockedTitle");detail.textContent=t("editingBlockedDetail");copy.append(title,detail);toast.replaceChildren(icon,copy);toast.dataset.tone="editing";toast.hidden=false;document.body.classList.remove("editor-blocked-hint");void toast.offsetWidth;document.body.classList.add("editor-blocked-hint");clearTimeout(showToast.timer);showToast.timer=setTimeout(hideToast,3800);
  }
  function setLoading(loading){ document.body.classList.toggle("loading",loading); pathEl.textContent=loading?t("loading"):(state.currentPath||t("ready")); }

  function protectMath(source){ const tokens=[]; const pattern=/\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$(?!\s)(?:\\.|[^$\n])+?\$/g; return {source:source.replace(pattern,(match)=>{const token=`LUMAMATHTOKEN${tokens.length}END`;tokens.push(match);return token;}),tokens}; }
  function protectSubscript(source){const transform=(text)=>text.replace(/(?<!~)~([^~\n]+)~(?!~)/g,(_match,value)=>`<sub>${escapeHtml(value)}</sub>`);let output="",last=0;const codePattern=/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`/g;for(const match of source.matchAll(codePattern)){output+=transform(source.slice(last,match.index))+match[0];last=match.index+match[0].length;}return output+transform(source.slice(last));}
  function extractExtensions(source){ const abbreviations={}; const footnotes={}; const lines=source.split("\n"), kept=[]; for(let index=0;index<lines.length;index+=1){let match=/^\*\[([^\]]+)\]:\s*(.+)$/.exec(lines[index]);if(match){abbreviations[match[1]]=match[2];continue;}match=/^\[\^([^\]]+)\]:\s*(.*)$/.exec(lines[index]);if(match){const body=[match[2]];while(index+1<lines.length&&/^\s{2,}\S/.test(lines[index+1]))body.push(lines[++index].trim());footnotes[match[1]]=body.join(" ");continue;}if(/^\s*(?:import|export)\s.+from\s+["']/.test(lines[index])){kept.push(`\`${lines[index]}\``);continue;}kept.push(lines[index]);}
    let result=kept.join("\n"); Object.keys(footnotes).forEach((id)=>{const ref=new RegExp(`\\[\\^${escapeRegExp(id)}\\]`,`g`);result=result.replace(ref,`<sup class="footnote-ref"><a href="#footnote-${escapeHtml(id)}">${escapeHtml(id)}</a></sup>`);});
    const entries=Object.entries(footnotes); if(entries.length){result+=`\n\n<section class="footnotes"><hr><ol>${entries.map(([id,body])=>`<li id="footnote-${escapeHtml(id)}">${escapeHtml(body)} <a href="#">↩</a></li>`).join("")}</ol></section>`;} return {source:result,abbreviations}; }

  const allowedTags=new Set("a abbr audio blockquote br code del details div em h1 h2 h3 h4 h5 h6 hr img input kbd li mark ol p pre s section source span strong sub summary sup table tbody td th thead tr ul video".split(" "));
  const allowedAttrs=new Set("alt aria-label aria-hidden checked class colspan controls disabled href id loop muted open poster preload role rowspan src start title type".split(" "));
  function safeLink(value){ const url=String(value||"").trim(); if(!url)return""; if(/^(javascript|vbscript|data:text\/html):/i.test(url))return"#"; return url; }
  function sanitizeHtml(html){ const doc=new DOMParser().parseFromString(`<main>${html}</main>`,"text/html"),root=doc.body.firstElementChild; [...root.querySelectorAll("*")].forEach((el)=>{const tag=el.tagName.toLowerCase();if(!allowedTags.has(tag)){if(["script","style","iframe","object","embed","form"].includes(tag))el.remove();else el.replaceWith(...el.childNodes);return;}[...el.attributes].forEach((attr)=>{const name=attr.name.toLowerCase();if(name.startsWith("on")||name==="style"||!allowedAttrs.has(name))el.removeAttribute(attr.name);});if(el.hasAttribute("href"))el.setAttribute("href",safeLink(el.getAttribute("href")));if(el.hasAttribute("src"))el.setAttribute("src",safeLink(el.getAttribute("src")));if(tag==="input"){if(el.getAttribute("type")!=="checkbox"){el.remove();return;}el.setAttribute("disabled","");}});return root.innerHTML; }

  function mediaUrl(raw){ const value=String(raw||"").trim().replace(/^<|>$/g,"");if(window.lumaWeb?.mediaUrl)return window.lumaWeb.mediaUrl(value,state.currentPath);if(/^(data:image\/|blob:)/i.test(value))return value;if(/^https?:/i.test(value))return value;if(state.sourceType==="remote"){try{return new URL(value,state.currentBase).href;}catch{return"";}}if(state.sourceType==="upload")return"";const query=new URLSearchParams({path:value,from:state.currentPath});return`/api/media?${query}`; }
  function rewriteMedia(root){ root.querySelectorAll("img, audio, video").forEach((el)=>{const raw=el.getAttribute("src")||"";el.dataset.originalSrc=raw;const resolved=mediaUrl(raw);if(resolved)el.setAttribute("src",resolved);else el.removeAttribute("src");el.setAttribute("loading","lazy");}); }

  function updateImageViewerLabels(){
    $("#image-viewer-title").textContent=imageT("preview");
    $("#image-viewer-close").setAttribute("aria-label",imageT("close"));
    imageViewerSizeEl.textContent=imageT(state.imageViewerActual?"fit":"actual");
  }
  function setImageViewerActual(actual){state.imageViewerActual=Boolean(actual);imageViewerEl.classList.toggle("actual-size",state.imageViewerActual);updateImageViewerLabels();}
  function closeImageViewer(){if(imageViewerEl.open)imageViewerEl.close();imageViewerImageEl.removeAttribute("src");imageViewerCaptionEl.textContent="";setImageViewerActual(false);}
  function openImageViewer(image){
    const src=image.currentSrc||image.src;if(!src)return;
    const label=image.alt||image.title||image.dataset.originalSrc||imageT("preview");
    imageViewerImageEl.src=src;imageViewerImageEl.alt=image.alt||"";imageViewerCaptionEl.textContent=label;setImageViewerActual(false);
    if(!imageViewerEl.open)imageViewerEl.showModal();
  }
  function enhanceDocumentImages(root){
    root.querySelectorAll("img").forEach((image)=>{
      image.classList.add("document-image");image.tabIndex=0;image.setAttribute("role","button");image.setAttribute("aria-label",`${imageT("open")}: ${image.alt||image.dataset.originalSrc||imageT("preview")}`);image.title=imageT("open");
      const classify=()=>{if(!image.naturalWidth||!image.naturalHeight)return;image.style.setProperty("--image-natural-width",`${image.naturalWidth}px`);const ratio=image.naturalHeight/image.naturalWidth;image.classList.toggle("image-portrait",ratio>1.25);image.classList.toggle("image-long",ratio>2.35);};
      image.addEventListener("load",classify,{once:true});if(image.complete)classify();
      image.addEventListener("error",()=>{image.classList.add("image-error");image.setAttribute("aria-label",imageT("unavailable"));if(!image.nextElementSibling?.classList.contains("image-error-note")){const note=document.createElement("small");note.className="image-error-note";note.textContent=`${imageT("unavailable")} · ${image.dataset.originalSrc||""}`;image.after(note);}},{once:true});
      image.addEventListener("click",()=>openImageViewer(image));image.addEventListener("keydown",(event)=>{if(event.key!=="Enter"&&event.key!==" ")return;event.preventDefault();openImageViewer(image);});
    });
  }

  function enhanceTextNodes(root,abbreviations){ const terms=Object.keys(abbreviations).sort((a,b)=>b.length-a.length);const abbrPattern=terms.length?terms.map(escapeRegExp).join("|"):"(?!)";const pattern=new RegExp(`(:[a-z0-9_+-]+:|\\^[^\\^\\n]+\\^|~[^~\\n]+~|\\b(?:${abbrPattern})\\b)`,"gi");const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach((node)=>{if(node.parentElement?.closest("pre,code,kbd,a,.katex,.mermaid,abbr,sup,sub"))return;const text=node.nodeValue;if(!pattern.test(text)){pattern.lastIndex=0;return;}pattern.lastIndex=0;const fragment=document.createDocumentFragment();let last=0;for(const match of text.matchAll(pattern)){fragment.append(text.slice(last,match.index));const token=match[0];let element=null;if(/^:[a-z0-9_+-]+:$/i.test(token)&&emojiMap[token.slice(1,-1)])fragment.append(emojiMap[token.slice(1,-1)]);else if(token.startsWith("^")&&token.endsWith("^")){element=document.createElement("sup");element.textContent=token.slice(1,-1);}else if(token.startsWith("~")&&token.endsWith("~")){element=document.createElement("sub");element.textContent=token.slice(1,-1);}else{const key=terms.find((term)=>term.toLowerCase()===token.toLowerCase());if(key){element=document.createElement("abbr");element.title=abbreviations[key];element.textContent=token;}}if(element)fragment.append(element);else if(!emojiMap[token.slice(1,-1)])fragment.append(token);last=match.index+token.length;}fragment.append(text.slice(last));node.replaceWith(fragment);}); }

  function enhanceAlerts(root){ root.querySelectorAll("blockquote").forEach((quote)=>{const first=quote.querySelector("p");if(!first)return;const match=/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i.exec(first.textContent);if(!match)return;quote.classList.add("callout",`callout-${match[1].toLowerCase()}`);first.innerHTML=first.innerHTML.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i,`<strong>${match[1]}</strong><br>`);}); }
  function slugify(text,used){const base=text.trim().toLowerCase().replace(/\s+/g,"-").replace(/[^\p{L}\p{N}_-]/gu,"")||"section";let id=base,index=2;while(used.has(id))id=`${base}-${index++}`;used.add(id);return id;}
  function buildOutline(){ outlineEl.innerHTML="";const headings=[...contentEl.querySelectorAll("h1,h2,h3,h4")];if(!headings.length){const p=document.createElement("p");p.className="sidebar-empty";p.textContent=t("noOutline");outlineEl.appendChild(p);return;}headings.forEach((heading)=>{const button=document.createElement("button");button.type="button";button.className=`outline-item level-${heading.tagName.slice(1)}`;button.textContent=heading.textContent;button.addEventListener("click",()=>{heading.scrollIntoView({behavior:"smooth",block:"start"});sidebarEl.classList.remove("open");});outlineEl.appendChild(button);});}

  async function renderDocument(preserve=false,requestId=state.documentRequestId,markdownText=state.renderText){ if(requestId!==state.documentRequestId)return false;const position=preserve?captureReadingPosition():{ratio:0};closeImageViewer();if(state.activeAdapter)disposeActiveAdapter();state.documentKind="markdown";document.body.dataset.documentKind="markdown";contentEl.classList.add("prose");contentEl.classList.remove("adapter-content");if(!markdownText){contentEl.replaceChildren();rawEl.querySelector("code").textContent=state.rawText;buildOutline();rebuildMedia();updateToolbarCapabilities("markdown",{paged:true,source:true,media:true});requestAnimationFrame(updatePagination);return true;}const extensions=extractExtensions(markdownText);const protectedMath=protectMath(extensions.source);const normalizedStrong=window.LumaReaderUtils.normalizeStrongEmphasis(protectedMath.source);const parsedText=protectSubscript(normalizedStrong);let html=window.marked.parse(parsedText,{gfm:true,breaks:false});protectedMath.tokens.forEach((math,index)=>{html=html.replaceAll(`LUMAMATHTOKEN${index}END`,escapeHtml(math));});contentEl.innerHTML=sanitizeHtml(html);const used=new Set();contentEl.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((heading)=>{heading.id=slugify(heading.textContent,used);});rewriteMedia(contentEl);enhanceDocumentImages(contentEl);enhanceAlerts(contentEl);
    if(window.renderMathInElement){try{window.renderMathInElement(contentEl,{delimiters:[{left:"$$",right:"$$",display:true},{left:"\\[",right:"\\]",display:true},{left:"\\(",right:"\\)",display:false},{left:"$",right:"$",display:false}],throwOnError:false,strict:"ignore",ignoredTags:["script","noscript","style","textarea","pre","code"]});}catch(error){console.warn("KaTeX",error);}}
    enhanceTextNodes(contentEl,extensions.abbreviations);contentEl.querySelectorAll("pre code").forEach((code)=>{if(code.classList.contains("language-mermaid")){const container=document.createElement("div");container.className="mermaid";container.textContent=code.textContent;code.parentElement.replaceWith(container);return;}try{window.hljs?.highlightElement(code);}catch{}const pre=code.closest("pre");if(pre&&!pre.querySelector(".copy-code")){const copy=document.createElement("button");copy.type="button";copy.className="copy-code";copy.textContent=t("copy");copy.addEventListener("click",async()=>{await navigator.clipboard.writeText(code.textContent);copy.textContent=t("copied");setTimeout(()=>copy.textContent=t("copy"),1200);});pre.appendChild(copy);}});
    if(window.mermaid&&contentEl.querySelector(".mermaid")){try{window.mermaid.initialize({startOnLoad:false,securityLevel:"strict",theme:document.documentElement.classList.contains("dark")?"dark":"default",fontFamily:"-apple-system, BlinkMacSystemFont, sans-serif",suppressErrorRendering:true});await window.mermaid.run({nodes:contentEl.querySelectorAll(".mermaid")});}catch(error){console.warn("Mermaid",error);}}
    if(requestId!==state.documentRequestId)return false;if(editorPreviewIsActive())assignEditorPreviewBlocks(parsedText);else state.editorPreviewBlocks=[];
    rawEl.querySelector("code").textContent=state.rawText;buildOutline();rebuildMedia();updateToolbarCapabilities("markdown",{paged:true,source:true,media:true});requestAnimationFrame(()=>{if(requestId!==state.documentRequestId)return;updatePagination();if(preserve)restoreReadingPosition(position);if(editorPreviewIsActive())scheduleEditorScrollMapRefresh();});document.fonts?.ready?.then(()=>{if(requestId!==state.documentRequestId)return;if(editorPreviewIsActive())scheduleEditorScrollMapRefresh();else scheduleLayoutRefresh(position);});contentEl.querySelectorAll("img").forEach((image)=>image.addEventListener("load",()=>{if(requestId!==state.documentRequestId)return;if(editorPreviewIsActive())scheduleEditorScrollMapRefresh();else scheduleLayoutRefresh(captureReadingPosition());},{once:true}));return true; }

  function rebuildMedia(){state.media=[...contentEl.querySelectorAll("img,audio,video")].map((el)=>({tag:el.tagName.toLowerCase(),src:el.currentSrc||el.src||"",alt:el.alt||el.title||""})).filter((item)=>item.src);mediaGridEl.innerHTML="";$("#media-count").textContent=state.media.length?` · ${state.media.length}`:"";if(!state.media.length){const p=document.createElement("p");p.className="sidebar-empty";p.textContent=t("noMedia");mediaGridEl.appendChild(p);return;}state.media.forEach((item,index)=>{const figure=document.createElement("figure");if(item.tag==="img"){const img=document.createElement("img");img.src=item.src;img.alt=item.alt;img.loading="lazy";img.tabIndex=0;img.setAttribute("role","button");img.setAttribute("aria-label",`${imageT("open")}: ${item.alt||index+1}`);img.addEventListener("click",()=>openImageViewer(img));img.addEventListener("keydown",(event)=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openImageViewer(img);}});figure.appendChild(img);}else{const media=document.createElement(item.tag);media.src=item.src;media.controls=true;figure.appendChild(media);}const caption=document.createElement("figcaption");caption.textContent=item.alt||`${t("media")} ${index+1}`;figure.appendChild(caption);mediaGridEl.appendChild(figure);});}

  function treeFromFiles(files){const root={dirs:new Map(),files:[]};files.forEach((file)=>{const parts=file.path.split("/"),name=parts.pop(),extension=file.extension||file.ext||extensionOf(name);let node=root;parts.forEach((part)=>{if(!node.dirs.has(part))node.dirs.set(part,{dirs:new Map(),files:[]});node=node.dirs.get(part);});node.files.push({...file,extension,displayName:name});});return root;}
  function closeSessionDialog(){state.sessionDialogPath="";if(sessionDialogEl.open)sessionDialogEl.close();}
  function openRemoveDocumentDialog(file){
    if(!window.lumaWeb?.removeDocument)return;state.sessionDialogMode="remove";state.sessionDialogPath=file.path;
    sessionDialogTitleEl.textContent=t("removeTitle");sessionDialogCopyEl.textContent=formatTemplate("removeCopy",{name:file.displayName||file.name||file.path});
    sessionDialogFilesEl.replaceChildren();sessionDialogFilesEl.hidden=true;sessionDesktopLinkEl.hidden=true;sessionDialogConfirmEl.hidden=false;sessionDialogConfirmEl.textContent=t("removeConfirm");sessionDialogCancelEl.textContent=t("removeCancel");
    if(!sessionDialogEl.open)sessionDialogEl.showModal();requestAnimationFrame(()=>sessionDialogCancelEl.focus());
  }
  function renderSessionLimitFiles(){
    sessionDialogFilesEl.replaceChildren();
    state.files.forEach((file)=>{const row=document.createElement("div");row.className="session-dialog-file";const name=document.createElement("span");name.textContent=file.name||file.path;name.title=file.path;const remove=document.createElement("button");remove.type="button";remove.textContent=t("removeConfirm");remove.addEventListener("click",()=>removeWebDocument(file.path,{continueImport:true}));row.append(name,remove);sessionDialogFilesEl.appendChild(row);});
    sessionDialogFilesEl.hidden=!state.files.length;
  }
  function openSessionLimitDialog(pendingFiles=[]){
    if(!window.lumaWeb)return;state.pendingWebFiles=[...pendingFiles];state.sessionDialogMode="limit";state.sessionDialogPath="";
    const limit=window.lumaWeb.maxSessionDocuments||3;sessionDialogTitleEl.textContent=t("limitTitle");sessionDialogCopyEl.textContent=formatTemplate("limitCopy",{limit});renderSessionLimitFiles();sessionDesktopLinkEl.hidden=false;$("#session-desktop-copy").textContent=t("desktopPrompt");$("#session-desktop-action").textContent=t("desktopAction");
    sessionDialogConfirmEl.hidden=true;sessionDialogCancelEl.textContent=t("limitDismiss");if(!sessionDialogEl.open)sessionDialogEl.showModal();requestAnimationFrame(()=>sessionDialogFilesEl.querySelector("button")?.focus());
  }
  async function consumeWebImportResult(result){
    await loadFiles({showProgress:true});if(result?.path)await openProjectFile(result.path);
    if(result?.pendingFiles?.length)openSessionLimitDialog(result.pendingFiles);
  }
  async function removeWebDocument(path,{continueImport=false}={}){
    if(!window.lumaWeb?.removeDocument)return;const wasCurrent=path===state.currentPath;
    if(wasCurrent&&state.editing)resetEditorState();const result=window.lumaWeb.removeDocument(path);if(!result?.ok)return;
    await loadFiles({showProgress:true});
    if(wasCurrent){if(result.nextPath)await openProjectFile(result.nextPath);else{history.replaceState(null,"",location.pathname);showEmptyLibrary();}}
    else renderTree();
    const pending=continueImport?[...state.pendingWebFiles]:[];state.pendingWebFiles=[];closeSessionDialog();showToast(t("removed"));
    if(pending.length){const imported=await window.lumaWeb.importFiles(pending);await consumeWebImportResult(imported);}
  }
  function renderTreeNode(node,container,parentPath="",autoOpenFolders=null){[...node.dirs.entries()].sort((a,b)=>a[0].localeCompare(b[0],state.language,{numeric:true})).forEach(([name,child])=>{const folderPath=parentPath?`${parentPath}/${name}`:name,details=document.createElement("details");details.className="folder";details.open=autoOpenFolders?autoOpenFolders.has(folderPath):state.openFolders.has(folderPath);details.addEventListener("toggle",()=>{if(autoOpenFolders)return;details.open?state.openFolders.add(folderPath):state.openFolders.delete(folderPath);});const summary=document.createElement("summary");summary.textContent=name;details.appendChild(summary);const inner=document.createElement("div");inner.className="folder-contents";renderTreeNode(child,inner,folderPath,autoOpenFolders);details.appendChild(inner);container.appendChild(details);});[...node.files].sort((a,b)=>a.displayName.localeCompare(b.displayName,state.language,{numeric:true})).forEach((file)=>{const row=document.createElement("div");row.className="file-row";row.classList.toggle("active",file.path===state.currentPath);const button=document.createElement("button");button.type="button";button.className="file-button";button.textContent=file.displayName;button.title=file.path;button.classList.toggle("active",file.path===state.currentPath);button.addEventListener("click",()=>openProjectFile(file.path));row.appendChild(button);if(window.lumaWeb){const remove=document.createElement("button");remove.type="button";remove.className="file-remove-button";remove.textContent="×";remove.title=t("removeDocument");remove.setAttribute("aria-label",`${t("removeDocument")}: ${file.displayName}`);remove.addEventListener("click",(event)=>{event.stopPropagation();openRemoveDocumentDialog(file);});row.appendChild(remove);}container.appendChild(row);});}
  function renderTree(){const query=searchEl.value.trim().toLocaleLowerCase(state.language);const enabled=state.files.filter(currentFormatIsEnabled);const visible=query?enabled.filter((file)=>file.path.toLocaleLowerCase(state.language).includes(query)):enabled;treeEl.innerHTML="";if(!visible.length){const p=document.createElement("p");p.className="sidebar-empty";p.textContent=state.libraryRoot?t("noMatches"):t("noLibrary");treeEl.appendChild(p);return;}const autoOpenFolders=query?new Set(window.LumaReaderUtils.ancestorFolderPaths(visible)):null;renderTreeNode(treeFromFiles(visible),treeEl,"",autoOpenFolders);}

  async function loadFiles({showProgress=false}={}){const scanId=showProgress?startLibraryScan():null;try{const response=await fetch("/api/files",{cache:"no-store"}),data=await response.json();if(!response.ok||data.error)throw new Error(data.error||`Unable to scan library (${response.status})`);state.libraryRoot=data.root||null;state.files=data.files||[];state.typeCatalog=new Map((data.types||[]).map((type)=>[type.extension||type.ext,type]));updateLibraryDisplay();renderTree();return data;}finally{if(scanId!==null)stopLibraryScan(scanId);}}
  function beginDocumentRequest(){state.documentRequestId+=1;state.documentAbortController?.abort();state.documentAbortController=new AbortController();stopLiveRefresh();setLoading(true);return{id:state.documentRequestId,signal:state.documentAbortController.signal};}
  function requestIsCurrent(requestId){return requestId===state.documentRequestId;}
  function finishDocumentRequest(requestId){if(!requestIsCurrent(requestId))return;state.documentAbortController=null;setLoading(false);}
  async function consumePayload(data,{preserve=false,requestId=state.documentRequestId}={}){if(data.error)throw new Error(data.error);if(!requestIsCurrent(requestId))return false;resetEditorState();contentEl.classList.remove("library-prompt-active");state.currentPath=data.path;state.currentSource=data.path;state.currentBase=data.base||"";state.currentName=data.name;state.sourceType=data.sourceType;state.rawText=data.text||"";state.renderText=data.renderText||data.text||"";state.modifiedNs=data.modifiedNs??null;state.documentKind=data.kind||"markdown";nameEl.textContent=data.name;pathEl.textContent=data.path;history.replaceState(null,"",`?source=${encodeURIComponent(data.path)}`);renderTree();setView("rendered");if(state.documentKind==="markdown")await renderDocument(preserve,requestId);else await renderAdapterPayload(data,requestId);if(!requestIsCurrent(requestId))return false;updateEditorControls();startLiveRefresh();closeSidebarOnNarrow();return true;}
  async function openProjectFile(path,options={}){if(blockWhileEditing())return;const request=beginDocumentRequest();try{const response=await fetch(`/api/file?path=${encodeURIComponent(path)}`,{cache:"no-store",signal:request.signal}),data=await response.json();if(!requestIsCurrent(request.id))return;if(!response.ok&&data.error)throw new Error(data.error);await consumePayload(data,{...options,requestId:request.id});}catch(error){if(error.name==="AbortError"||!requestIsCurrent(request.id))return;showUnsupportedDocument(String(path).split("/").pop(),extensionOf(path),error.message);showToast(`${t("loadError")} ${error.message}`);}finally{finishDocumentRequest(request.id);}}
  async function openSource(source,options={}){if(blockWhileEditing())return;source=String(source||"").trim();if(!source){showToast(t("invalidSource"));return;}const request=beginDocumentRequest();try{const response=await fetch(`/api/open?source=${encodeURIComponent(source)}`,{cache:"no-store",signal:request.signal}),data=await response.json();if(!requestIsCurrent(request.id))return;if(!response.ok&&data.error)throw new Error(data.error);await consumePayload(data,{...options,requestId:request.id});}catch(error){if(error.name==="AbortError"||!requestIsCurrent(request.id))return;showUnsupportedDocument(String(source).split(/[\\/]/).pop(),extensionOf(source),error.message);showToast(`${t("loadError")} ${error.message}`);}finally{finishDocumentRequest(request.id);}}
  async function openUploadedFile(files){if(!files||blockWhileEditing())return;const list=files instanceof FileList||Array.isArray(files)?files:[files];if(window.lumaWeb?.importFiles){try{const result=await window.lumaWeb.importFiles(list);await consumeWebImportResult(result);return;}catch(error){showToast(`${t("loadError")} ${error.message}`);return;}}const file=list[0];if(!file)return;const extension=extensionOf(file.name),type=state.typeCatalog.get(extension)||fallbackType(extension);if(!type||!SUPPORTED_EXTENSION_SET.has(extension)){showUnsupportedDocument(file.name,extension);return;}const request=beginDocumentRequest();try{const text=type.binary?"":await file.text();if(!requestIsCurrent(request.id))return;const payload={path:file.name,name:file.name,extension,ext:extension,kind:type.kind,mime:type.mime,binary:type.binary,capabilities:type.capabilities||{},sourceType:"upload",text,renderText:text,uploadedFile:file,modifiedNs:null,size:file.size};state.currentSource="";state.currentBase="";await consumePayload(payload,{requestId:request.id});if(requestIsCurrent(request.id))stopLiveRefresh();}catch(error){if(error.name==="AbortError"||!requestIsCurrent(request.id))return;showUnsupportedDocument(file.name,extension,error.message);showToast(`${t("loadError")} ${error.message}`);}finally{finishDocumentRequest(request.id);}}

  async function chooseWebFiles(){
    if(blockWhileEditing())return;
    if(!window.lumaWeb?.chooseFiles){$("#file-picker").click();return;}
    try{
      const result=await window.lumaWeb.chooseFiles();
      if(!result?.supported){$("#file-picker").click();return;}
      await consumeWebImportResult(result);
    }catch(error){showToast(error?.message||t("loadError"));}
  }
  let fileDragDepth=0;
  function dragContainsFiles(event){return Array.from(event.dataTransfer?.types||[]).includes("Files");}
  function showDropOverlay(){dropOverlayEl.hidden=false;}
  function hideDropOverlay(){fileDragDepth=0;dropOverlayEl.hidden=true;}
  function handleFileDragEnter(event){if(!dragContainsFiles(event))return;event.preventDefault();fileDragDepth+=1;showDropOverlay();}
  function handleFileDragOver(event){if(!dragContainsFiles(event))return;event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect="copy";showDropOverlay();}
  function handleFileDragLeave(event){if(!dragContainsFiles(event))return;event.preventDefault();fileDragDepth=Math.max(0,fileDragDepth-1);if(!fileDragDepth)hideDropOverlay();}
  async function handleFileDrop(event){
    if(!dragContainsFiles(event))return;event.preventDefault();const files=event.dataTransfer?.files;hideDropOverlay();
    if(!files?.length)return;const hasDocument=Array.from(files).some((file)=>SUPPORTED_EXTENSION_SET.has(extensionOf(file.name)));
    if(!hasDocument){showToast(t("dropUnsupported"));return;}await openUploadedFile(files);
  }
  async function changeLibrary(){if(blockWhileEditing())return;if(!window.lumaDesktop?.chooseLibrary){showToast(t("folderSelectionUnavailable"));return;}try{await window.lumaDesktop.chooseLibrary();}catch(error){cancelDocumentRequest();showToast(error.message||t("loadError"));}}

  function startLiveRefresh(){stopLiveRefresh();if(state.editing||!["project","external"].includes(state.sourceType)||!state.currentSource)return;state.liveTimer=setInterval(async()=>{if(state.editing||state.saving)return;try{const response=await fetch(`/api/meta?source=${encodeURIComponent(state.currentSource)}`,{cache:"no-store"});if(!response.ok)return;const data=await response.json();if(data.modifiedNs&&state.modifiedNs&&data.modifiedNs!==state.modifiedNs){if(state.sourceType==="project")await openProjectFile(state.currentSource,{preserve:true});else await openSource(state.currentSource,{preserve:true});showToast(t("refreshed"));}}catch{}},1500);}
  function stopLiveRefresh(){if(state.liveTimer)clearInterval(state.liveTimer);state.liveTimer=null;}

  function applyFontSize(){const position=captureReadingPosition();state.fontSize=Math.max(14,Math.min(28,state.fontSize));document.documentElement.style.setProperty("--reader-size",`${state.fontSize}px`);localStorage.setItem("lumareader-font",String(state.fontSize));persistPreferences({fontSize:state.fontSize});scheduleLayoutRefresh(position);}
  function adjustFontSize(change){const amount=Number(change);if(!Number.isFinite(amount))return;state.fontSize=amount===0?18:state.fontSize+(amount>0?1:-1);applyFontSize();}
  function setMode(layout){
    if(layout==="paged")layout=`paged-${state.pagedDirection}`;
    if(!["vertical","horizontal","paged-horizontal","paged-vertical"].includes(layout))layout="vertical";
    const paged=layout.startsWith("paged-");state.mode=paged?"paged":layout;if(paged)state.pagedDirection=layout.endsWith("vertical")?"vertical":"horizontal";
    localStorage.setItem("lumareader-mode",state.mode);localStorage.setItem("lumareader-paged-direction",state.pagedDirection);persistPreferences({readingMode:state.mode,pagedDirection:state.pagedDirection});
    shellEl.dataset.mode=state.mode;shellEl.dataset.pageDirection=state.pagedDirection;readingModeEl.value=currentReadingLayout();renderReadingModeMenu();
    if(!state.activeAdapter){contentEl.scrollLeft=0;contentEl.scrollTop=0;}window.scrollTo({top:0,behavior:"auto"});requestAnimationFrame(()=>{updatePagination();updateToolbarCapabilities(state.documentKind,state.activeAdapter?.document?.meta?.capabilities||{});});
  }
  function setView(view){const sourceButton=$("#source-view");if(view==="source"&&sourceButton.hidden)return false;if(state.editing&&view!=="source"){blockWhileEditing();return false;}state.view=view;const source=view==="source",comparison=source&&state.editing&&state.editorPreview;contentEl.hidden=source&&!comparison;rawEl.hidden=!source||state.editing;sourceEditorEl.hidden=!source||!state.editing;shellEl.dataset.view=source?"source":"rendered";sourceButton.classList.toggle("active",source);sourceButton.setAttribute("aria-label",t(source?"renderedView":"sourceView"));sourceButton.removeAttribute("title");updateEditorPreviewLayout();requestAnimationFrame(updatePagination);return true;}
  function sourceScrollTarget(){return state.editing?sourceEditorEl:rawEl;}
  function activeScrollTarget(){return state.activeAdapter?.viewport||null;}
  function readingRatio(){const adapterTarget=activeScrollTarget();if(adapterTarget){const horizontal=adapterTarget.scrollWidth>adapterTarget.clientWidth&&adapterTarget.scrollHeight<=adapterTarget.clientHeight*1.2;const max=horizontal?adapterTarget.scrollWidth-adapterTarget.clientWidth:adapterTarget.scrollHeight-adapterTarget.clientHeight;return max>0?(horizontal?adapterTarget.scrollLeft:adapterTarget.scrollTop)/max:0;}if(state.editing){const max=sourceEditorEl.scrollHeight-sourceEditorEl.clientHeight;return max>0?sourceEditorEl.scrollTop/max:0;}if(state.mode==="vertical"){const max=document.documentElement.scrollHeight-innerHeight;return max>0?scrollY/max:0;}const target=state.view==="source"?sourceScrollTarget():contentEl,vertical=usesVerticalAxis(),max=vertical?target.scrollHeight-target.clientHeight:target.scrollWidth-target.clientWidth;return max>0?(vertical?target.scrollTop:target.scrollLeft)/max:0;}
  function restoreReadingRatio(ratio){const adapterTarget=activeScrollTarget();if(adapterTarget){const horizontal=adapterTarget.scrollWidth>adapterTarget.clientWidth&&adapterTarget.scrollHeight<=adapterTarget.clientHeight*1.2;const max=horizontal?adapterTarget.scrollWidth-adapterTarget.clientWidth:adapterTarget.scrollHeight-adapterTarget.clientHeight;if(horizontal)adapterTarget.scrollLeft=max*ratio;else adapterTarget.scrollTop=max*ratio;}else if(state.editing){sourceEditorEl.scrollTop=(sourceEditorEl.scrollHeight-sourceEditorEl.clientHeight)*ratio;}else if(state.mode==="vertical"){const max=document.documentElement.scrollHeight-innerHeight;window.scrollTo({top:max*ratio,behavior:"auto"});}else{const target=state.view==="source"?sourceScrollTarget():contentEl,vertical=usesVerticalAxis(),max=vertical?target.scrollHeight-target.clientHeight:target.scrollWidth-target.clientWidth;if(vertical)target.scrollTop=max*ratio;else target.scrollLeft=max*ratio;}updatePagination();}
  function updateProgress(){const ratio=readingRatio();progressEl.style.width=`${Math.max(0,Math.min(100,ratio*100))}%`;}
  function updatePageNavigation(visible,current=1,total=1){total=Math.max(1,total);current=Math.min(total,Math.max(1,current));pagedNavigationEl.hidden=!visible;pagedNavigationEl.classList.toggle("visible",visible);pageNumberEl.textContent=visible?`${current} / ${total}`:"";pagePreviousEl.textContent=state.pagedDirection==="vertical"?"↑":"‹";pageNextEl.textContent=state.pagedDirection==="vertical"?"↓":"›";pagePreviousEl.disabled=!visible||current<=1;pageNextEl.disabled=!visible||current>=total;}
  function updatePagination(){if(state.editing){updatePageNavigation(false);updateProgress();return;}if(state.activeAdapter){const total=Math.max(1,state.activeAdapter.getPageCount?.()||1),current=Math.min(total,Math.max(1,state.activeAdapter.currentPage||1)),visible=state.mode==="paged"&&Boolean(state.activeAdapter.supportsPagedMode?.());updatePageNavigation(visible,current,total);updateProgress();return;}const paged=state.mode==="paged",target=state.view==="source"?sourceScrollTarget():contentEl;if(!paged){updatePageNavigation(false);updateProgress();return;}const vertical=usesVerticalAxis(),extent=Math.max(1,vertical?target.clientHeight:target.clientWidth),scrollExtent=vertical?target.scrollHeight:target.scrollWidth,offset=vertical?target.scrollTop:target.scrollLeft,total=Math.max(1,Math.ceil(scrollExtent/extent)),current=Math.min(total,Math.max(1,Math.round(offset/extent)+1));updatePageNavigation(true,current,total);updateProgress();}
  function moveReading(direction){if(state.editing)return;if(state.activeAdapter?.supportsPagedMode?.()){const next=(state.activeAdapter.currentPage||1)+direction;state.activeAdapter.goToPage?.(next);setTimeout(updatePagination,260);return;}if(state.mode==="vertical")return;const target=state.view==="source"?sourceScrollTarget():contentEl;if(state.mode==="paged"&&usesVerticalAxis())target.scrollBy({top:direction*target.clientHeight,behavior:"smooth"});else{const step=state.mode==="paged"?target.clientWidth:Math.max(360,target.clientWidth*.78);target.scrollBy({left:direction*step,behavior:"smooth"});}setTimeout(updatePagination,260);}

  function openMediaPanel(){if(window.LumaReaderUI?.openUtilityPanel){window.LumaReaderUI.openUtilityPanel("media");return;}mediaPanelEl.classList.add("open");mediaPanelEl.setAttribute("aria-hidden","false");scrimEl.hidden=false;}
  function closeMediaPanel(){if(window.LumaReaderUI?.closeUtilityPanel){window.LumaReaderUI.closeUtilityPanel();return;}mediaPanelEl.classList.remove("open");mediaPanelEl.setAttribute("aria-hidden","true");scrimEl.hidden=true;}
  function switchSidebarPanel(panelId){document.querySelectorAll(".sidebar-tab").forEach((tab)=>{const active=tab.dataset.panel===panelId;tab.classList.toggle("active",active);tab.setAttribute("aria-selected",active?"true":"false");});document.querySelectorAll(".sidebar-panel").forEach((panel)=>panel.hidden=panel.id!==panelId);}

  async function syncFormats(extensions){
    state.enabledExtensions=new Set((extensions||MARKDOWN_EXTENSIONS).filter((extension)=>SUPPORTED_EXTENSION_SET.has(extension)));
    renderTree();
    if(state.editing)return;
    const current=state.files.find((file)=>file.path===state.currentPath);
    if(current&&currentFormatIsEnabled(current))return;
    const next=state.files.find(currentFormatIsEnabled);
    if(next)await openProjectFile(next.path);
  }

  document.addEventListener("luma:ui-ready",(event)=>syncFormats(event.detail?.formats?.extensions));
  document.addEventListener("luma:format-selection-change",(event)=>syncFormats(event.detail?.extensions));

  contentEl.addEventListener("click",(event)=>{if(!state.currentPath&&contentEl.classList.contains("library-prompt-active")){event.preventDefault();changeLibrary();return;}const link=event.target.closest("a");if(!link)return;const href=link.getAttribute("href")||"";if(!href)return;if(href.startsWith("#")){event.preventDefault();contentEl.querySelector(href)?.scrollIntoView({behavior:"smooth"});return;}if(href.startsWith("file://")||(/^https?:/i.test(href)&&isDocumentHref(href))){event.preventDefault();openSource(href);return;}if(isDocumentHref(href)){event.preventDefault();if(state.sourceType==="remote"){openSource(new URL(href,state.currentBase).href);return;}if(state.sourceType==="external"){const base=new URL(state.currentBase);openSource(new URL(href,base).href);return;}const parts=state.currentPath.split("/");parts.pop();href.split(/[?#]/)[0].split("/").forEach((part)=>{if(!part||part===".")return;if(part==="..")parts.pop();else parts.push(decodeURIComponent(part));});const target=parts.join("/");if(state.files.some((file)=>file.path===target))openProjectFile(target);}});

  readingModeToggleEl.addEventListener("click",()=>toggleToolbarMenu(readingModeMenuEl,readingModeToggleEl));
  paletteToggleEl.addEventListener("click",()=>toggleToolbarMenu(paletteMenuEl,paletteToggleEl));
  languageToggleEl.addEventListener("click",()=>toggleToolbarMenu(languageMenuEl,languageToggleEl));
  document.addEventListener("click",(event)=>{if(!event.target.closest(".toolbar-select-button")&&!event.target.closest(".toolbar-menu"))closeToolbarMenus();});
  languageEl.addEventListener("change",()=>applyLanguage(languageEl.value));themeEl.addEventListener("click",toggleTheme);
  searchEl.addEventListener("input",renderTree);$("#refresh")?.addEventListener("click",async()=>{if(blockWhileEditing())return;try{await loadFiles({showProgress:true});showToast(t("refreshed"));}catch(error){showToast(error.message||t("loadError"));}});
  $("#change-library")?.addEventListener("click",changeLibrary);
  newMarkdownButtonEl.addEventListener("click",openNewMarkdownDialog);newMarkdownNameEl.addEventListener("input",()=>{showNewMarkdownError("");updateNewMarkdownDialog();});newMarkdownFormEl.addEventListener("submit",createMarkdownDocument);$("#new-markdown-cancel").addEventListener("click",closeNewMarkdownDialog);newMarkdownDialogEl.addEventListener("cancel",(event)=>{event.preventDefault();if(state.creatingDocument)return;closeNewMarkdownDialog();});
  sessionDialogCancelEl.addEventListener("click",()=>{state.pendingWebFiles=[];closeSessionDialog();});sessionDialogConfirmEl.addEventListener("click",()=>{if(state.sessionDialogPath)removeWebDocument(state.sessionDialogPath);});sessionDialogEl.addEventListener("cancel",(event)=>{event.preventDefault();state.pendingWebFiles=[];closeSessionDialog();});
  shareButtonEl.addEventListener("click",shareCurrentMarkdown);$("#share-link-copy").addEventListener("click",copyShareLink);$("#share-dialog-close").addEventListener("click",closeShareDialog);shareDialogEl.addEventListener("cancel",(event)=>{event.preventDefault();closeShareDialog();});
  $("#choose-file").addEventListener("click",chooseWebFiles);$("#file-picker").addEventListener("change",async(event)=>{await openUploadedFile(event.target.files);event.target.value="";});
  window.addEventListener("dragenter",handleFileDragEnter);window.addEventListener("dragover",handleFileDragOver);window.addEventListener("dragleave",handleFileDragLeave);window.addEventListener("drop",handleFileDrop);
  $("#font-down").addEventListener("click",()=>adjustFontSize(-1));$("#font-up").addEventListener("click",()=>adjustFontSize(1));
  pagePreviousEl.addEventListener("click",()=>moveReading(-1));pageNextEl.addEventListener("click",()=>moveReading(1));
  $("#source-view").addEventListener("click",()=>{if(blockWhileEditing())return;setView(state.view==="source"?"rendered":"source");});
  $("#edit-document").addEventListener("click",()=>state.editing?saveEditing():beginEditing());$("#cancel-edit").addEventListener("click",()=>leaveEditing({discarded:true}));
  editorPreviewToggleEl.addEventListener("change",()=>{state.editorPreview=editorPreviewToggleEl.checked;localStorage.setItem("lumareader-editor-preview",String(state.editorPreview));persistPreferences({editorPreview:state.editorPreview});updateEditorPreviewLayout({render:true});scheduleLayoutRefresh();if(state.editing)sourceEditorEl.focus();});
  editorPreviewEndEl.addEventListener("click",showEditorPreviewEnd);
  const updateEditorSplitFromPointer=(event)=>{const stage=$(".document-stage"),rect=stage.getBoundingClientRect(),style=getComputedStyle(stage),stacked=matchMedia("(max-width: 820px)").matches,before=parseFloat(stacked?style.paddingTop:style.paddingLeft)||0,after=parseFloat(stacked?style.paddingBottom:style.paddingRight)||0,total=(stacked?stage.clientHeight:stage.clientWidth)-before-after,position=(stacked?event.clientY-rect.top:event.clientX-rect.left)-before;if(total>0)applyEditorSplitRatio(position/total);};
  editorPreviewResizerEl.addEventListener("pointerdown",(event)=>{if(!editorPreviewIsActive())return;event.preventDefault();editorPreviewResizerEl.setPointerCapture(event.pointerId);document.body.classList.add("editor-preview-resizing");updateEditorSplitFromPointer(event);});
  editorPreviewResizerEl.addEventListener("pointermove",(event)=>{if(editorPreviewResizerEl.hasPointerCapture(event.pointerId))updateEditorSplitFromPointer(event);});
  const finishEditorPreviewResize=(event)=>{if(!editorPreviewResizerEl.hasPointerCapture(event.pointerId))return;editorPreviewResizerEl.releasePointerCapture(event.pointerId);document.body.classList.remove("editor-preview-resizing");applyEditorSplitRatio(state.editorSplitRatio,{save:true});scheduleLayoutRefresh();scheduleEditorScrollMapRefresh();};
  editorPreviewResizerEl.addEventListener("pointerup",finishEditorPreviewResize);editorPreviewResizerEl.addEventListener("pointercancel",finishEditorPreviewResize);
  editorPreviewResizerEl.addEventListener("dblclick",()=>{applyEditorSplitRatio(.5,{save:true});scheduleLayoutRefresh();scheduleEditorScrollMapRefresh();});
  editorPreviewResizerEl.addEventListener("keydown",(event)=>{const stacked=matchMedia("(max-width: 820px)").matches,backward=stacked?"ArrowUp":"ArrowLeft",forward=stacked?"ArrowDown":"ArrowRight";if(![backward,forward,"Home"].includes(event.key))return;event.preventDefault();applyEditorSplitRatio(event.key==="Home"?.5:state.editorSplitRatio+(event.key===forward?.02:-.02),{save:true});scheduleLayoutRefresh();scheduleEditorScrollMapRefresh();});
  $("#media-view").addEventListener("click",openMediaPanel);$("#media-close").addEventListener("click",closeMediaPanel);scrimEl.addEventListener("click",closeMediaPanel);
  $("#export-pdf").addEventListener("click",exportCurrentPdf);
  $("#export-pdf").hidden=!window.lumaDesktop?.exportPdf;
  window.lumaDesktop?.onExportPdfRequested?.(exportCurrentPdf);
  $("#image-viewer-close").addEventListener("click",closeImageViewer);imageViewerSizeEl.addEventListener("click",()=>setImageViewerActual(!state.imageViewerActual));imageViewerEl.addEventListener("click",(event)=>{if(event.target===imageViewerEl)closeImageViewer();});imageViewerEl.addEventListener("close",()=>setImageViewerActual(false));
  readingModeEl.addEventListener("change",()=>setMode(readingModeEl.value));document.querySelectorAll(".sidebar-tab").forEach((button)=>button.addEventListener("click",()=>switchSidebarPanel(button.dataset.panel)));
  document.querySelectorAll(".reader-actions [data-tooltip-key]").forEach((button)=>{button.addEventListener("pointerenter",()=>showToolbarTooltip(button));button.addEventListener("pointerleave",hideToolbarTooltip);button.addEventListener("focus",()=>showToolbarTooltip(button));button.addEventListener("blur",hideToolbarTooltip);button.addEventListener("click",hideToolbarTooltip);});
  sidebarToggleEl.addEventListener("click",toggleSidebar);
  let resizeStartX=0,resizeStartWidth=0;
  sidebarResizerEl.addEventListener("pointerdown",(event)=>{if(isNarrow()||state.sidebarCollapsed)return;resizeStartX=event.clientX;resizeStartWidth=state.sidebarWidth;sidebarResizerEl.setPointerCapture(event.pointerId);document.body.classList.add("sidebar-resizing");});
  sidebarResizerEl.addEventListener("pointermove",(event)=>{if(!sidebarResizerEl.hasPointerCapture(event.pointerId))return;applySidebarWidth(resizeStartWidth+event.clientX-resizeStartX);});
  const finishSidebarResize=(event)=>{if(!sidebarResizerEl.hasPointerCapture(event.pointerId))return;sidebarResizerEl.releasePointerCapture(event.pointerId);document.body.classList.remove("sidebar-resizing");applySidebarWidth(state.sidebarWidth,{save:true});scheduleLayoutRefresh();};
  sidebarResizerEl.addEventListener("pointerup",finishSidebarResize);sidebarResizerEl.addEventListener("pointercancel",finishSidebarResize);
  sidebarResizerEl.addEventListener("dblclick",()=>{applySidebarWidth(320,{save:true});scheduleLayoutRefresh();});
  sidebarResizerEl.addEventListener("keydown",(event)=>{if(!["ArrowLeft","ArrowRight","Home"].includes(event.key))return;event.preventDefault();applySidebarWidth(event.key==="Home"?320:state.sidebarWidth+(event.key==="ArrowRight"?16:-16),{save:true});scheduleLayoutRefresh();});
  sourceEditorEl.addEventListener("input",()=>{state.editorDirty=sourceEditorEl.value!==state.rawText;state.editorSaved=false;pathEl.textContent=t("editing");updateEditorControls();scheduleEditorPreview();});
  sourceEditorEl.addEventListener("keydown",(event)=>{if(event.key!=="Tab"||event.metaKey||event.ctrlKey||event.altKey)return;event.preventDefault();const start=sourceEditorEl.selectionStart,end=sourceEditorEl.selectionEnd;sourceEditorEl.setRangeText("  ",start,end,"end");sourceEditorEl.dispatchEvent(new Event("input",{bubbles:true}));});
  window.addEventListener("scroll",()=>{updateProgress();closeToolbarMenus();},{passive:true});window.addEventListener("resize",()=>{hideToolbarTooltip();closeToolbarMenus();const position=captureReadingPosition();sidebarEl.classList.remove("open");document.body.classList.remove("sidebar-open");applySidebarWidth(state.sidebarWidth);applyEditorSplitRatio();updateSidebarToggle();scheduleLayoutRefresh(position);if(editorPreviewIsActive())scheduleEditorScrollMapRefresh();});contentEl.addEventListener("scroll",()=>{updatePagination();syncEditorSourceFromPreview();},{passive:true});rawEl.addEventListener("scroll",updatePagination,{passive:true});sourceEditorEl.addEventListener("scroll",()=>{updatePagination();syncEditorPreviewFromSource();},{passive:true});
  if("ResizeObserver" in window){const paginationObserver=new ResizeObserver(()=>requestAnimationFrame(()=>{updatePagination();if(editorPreviewIsActive())scheduleEditorScrollMapRefresh({sync:false});}));paginationObserver.observe(shellEl);paginationObserver.observe(contentEl);paginationObserver.observe(rawEl);paginationObserver.observe(sourceEditorEl);}
  sourceEditorEl.addEventListener("wheel",(event)=>{if(!editorPreviewIsActive())return;event.preventDefault();const scale=event.deltaMode===1?18:event.deltaMode===2?Math.max(1,sourceEditorEl.clientHeight):1;sourceEditorEl.scrollBy({top:event.deltaY*scale,left:event.deltaX*scale,behavior:"auto"});requestAnimationFrame(updateEditorPreviewEndAction);},{passive:false});
  [contentEl,rawEl].forEach((target)=>target.addEventListener("wheel",(event)=>{if(target===contentEl&&editorPreviewIsActive()){event.preventDefault();const scale=event.deltaMode===1?18:event.deltaMode===2?Math.max(1,sourceEditorEl.clientHeight):1;sourceEditorEl.scrollBy({top:event.deltaY*scale,left:event.deltaX*scale,behavior:"auto"});requestAnimationFrame(updateEditorPreviewEndAction);return;}if(state.mode==="vertical")return;event.preventDefault();if(state.mode==="horizontal"){target.scrollBy({left:event.deltaY+event.deltaX,behavior:"auto"});return;}const now=Date.now();if(now-state.lastWheelAt<420||Math.abs(event.deltaY)+Math.abs(event.deltaX)<12)return;state.lastWheelAt=now;moveReading(event.deltaY+event.deltaX>0?1:-1);},{passive:false}));

  document.addEventListener("keydown",(event)=>{const target=event.target,key=event.key.toLowerCase(),command=event.metaKey||event.ctrlKey;if(newMarkdownDialogEl.open&&event.key==="Escape"){event.preventDefault();closeNewMarkdownDialog();return;}if(command&&!event.shiftKey&&key==="s"){event.preventDefault();if(state.editing)saveEditing();return;}if(!window.lumaDesktop?.isDesktop&&command&&!event.altKey&&(["-","_","+","=","0"].includes(key))){event.preventDefault();event.stopPropagation();adjustFontSize(key==="0"?0:(["-","_"].includes(key)?-1:1));return;}if(target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement||target?.isContentEditable){if(event.key==="Escape")target.blur();return;}if(event.key==="Escape"){closeToolbarMenus();closeMediaPanel();closeSidebarOnNarrow();}});
  window.addEventListener("beforeunload",(event)=>{if(!state.editing||!state.editorDirty)return;event.preventDefault();event.returnValue="";});

  async function initialize(){const webReady=await window.lumaWeb?.ready;const localTheme=localStorage.getItem("lumareader-theme");document.documentElement.classList.toggle("dark",localTheme==="dark");const saved=await hydratePreferences();if(Number(saved.readerDefaultsVersion||0)<2){state.language="en";state.palette="dream-rose";document.documentElement.classList.remove("dark");localStorage.setItem("lumareader-language","en");localStorage.setItem("lumareader-theme","light");localStorage.setItem("lumareader-palette","dream-rose");persistPreferences({language:"en",theme:"light",palette:"dream-rose"});}if(Number(saved.readerDefaultsVersion||0)<3){state.mode="vertical";localStorage.setItem("lumareader-mode","vertical");persistPreferences({readingMode:"vertical",readerDefaultsVersion:3});}applySidebarWidth(state.sidebarWidth);applyPalette(state.palette);applyLanguage(state.language);updateThemeButton();applyFontSize();setMode(state.mode);updateSidebarToggle();window.lumaDesktop?.onSaveRequested?.(()=>{if(state.editing)saveEditing();});window.lumaDesktop?.onFontSizeRequested?.((change)=>adjustFontSize(Number(change)));window.lumaDesktop?.onLibraryChanged(async(payload)=>{const refreshId=++state.libraryRefreshId;state.libraryRoot=payload.root||null;state.openFolders.clear();showEmptyLibrary();try{await loadFiles({showProgress:true});if(refreshId!==state.libraryRefreshId)return;const first=state.files.find(currentFormatIsEnabled);if(first)await openProjectFile(first.path);else showEmptyLibrary();showToast(t("libraryChanged"));}catch(error){if(refreshId!==state.libraryRefreshId)return;showEmptyLibrary();showToast(error.message||t("loadError"));}});await loadFiles({showProgress:true});const params=new URLSearchParams(location.search),requested=params.get("source")||params.get("url")||params.get("file");if(requested){if(state.files.some((file)=>file.path===requested))await openProjectFile(requested);else await openSource(requested);return;}const preferred=state.files.find((file)=>file.path.endsWith("docs/story-review/00-閱讀順序與驗收範圍.md")&&currentFormatIsEnabled(file))||state.files.find(currentFormatIsEnabled);if(preferred)await openProjectFile(preferred.path);else showEmptyLibrary();if(webReady?.error)showToast(t("shareInvalid"));}
  function finishBootLoading(){requestAnimationFrame(()=>requestAnimationFrame(()=>{document.body.classList.remove("booting");$("#boot-loader")?.setAttribute("aria-hidden","true");}));}
  initialize().then(finishBootLoading).catch((error)=>{setLoading(false);contentEl.innerHTML=`<p class="error">${escapeHtml(error.message||error)}</p>`;finishBootLoading();});
})();
