'use strict';
const LANGUAGES=Object.freeze(['en','zh-Hant','zh-Hans','ja','ko','es','fr','de','pt-BR','ru','it']);
function initialLanguage(preferences,metadata){return LANGUAGES.includes(preferences?.language)?preferences.language:LANGUAGES.includes(metadata?.lumareaderDefaultLanguage)?metadata.lumareaderDefaultLanguage:'en';}
module.exports={LANGUAGES,initialLanguage};
