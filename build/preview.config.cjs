module.exports={...require("../package.json").build,
  appId:'com.kainnne.lumareader.bluepreview',productName:'LumaReader Blue Preview',
  extraMetadata:{version:'1.4.0-preview.2',lumareaderPreview:true},
  protocols:[],afterPack:'scripts/preview-after-pack.cjs',
  directories:{output:'/private/tmp/luma-direct-build.noindex'},
  mac:{...require('../package.json').build.mac,icon:'build/preview.icns',fileAssociations:[],notarize:false,identity:'Kaine Zhu (56B9GB8VQ3)',hardenedRuntime:true,forceCodeSigning:true,target:[{target:'dir',arch:['arm64']}]} 
};
