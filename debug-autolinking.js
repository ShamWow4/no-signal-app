const autolinking = require('expo-modules-autolinking');
autolinking.resolveModulesAsync({ platform: 'android', searchPaths: [__dirname] })
  .then(res => console.log(JSON.stringify(res.modules, null, 2)));
