'use strict';
const base=require('../package.json').build,{LANGUAGES}=require('../src/interface-defaults');
const language=process.env.LUMAREADER_DEFAULT_LANGUAGE;
if(!LANGUAGES.includes(language))throw Error('Choose a supported LUMAREADER_DEFAULT_LANGUAGE.');
const name=pattern=>pattern.replace('.${ext}','-'+language+'.${ext}');
module.exports={...base,extraMetadata:{lumareaderDefaultLanguage:language},directories:{...base.directories,output:'dist/languages/'+language},mac:{...base.mac,artifactName:name(base.mac.artifactName)},nsis:{...base.nsis,artifactName:name(base.nsis.artifactName)},portable:{...base.portable,artifactName:name(base.portable.artifactName)},linux:{...base.linux,artifactName:name(base.linux.artifactName)}};
