var cov_2503304m1f=function(){var path='/Users/Tom/Documents/FAB/getting-started-microservice/src/lib/metrics.js',hash='26cbc114a4c4b93b08203f8ddfee03aed8aab6a0',Function=function(){}.constructor,global=new Function('return this')(),gcv='__strykerCoverageCurrentTest__',coverageData={path:'/Users/Tom/Documents/FAB/getting-started-microservice/src/lib/metrics.js',statementMap:{'0':{start:{line:1,column:15},end:{line:1,column:35}},'1':{start:{line:2,column:19},end:{line:2,column:50}},'2':{start:{line:3,column:15},end:{line:3,column:35}},'3':{start:{line:5,column:16},end:{line:10,column:2}},'4':{start:{line:13,column:0},end:{line:15,column:3}},'5':{start:{line:14,column:2},end:{line:14,column:62}},'6':{start:{line:17,column:0},end:{line:17,column:25}}},fnMap:{'0':{name:'(anonymous_0)',decl:{start:{line:13,column:27},end:{line:13,column:28}},loc:{start:{line:13,column:38},end:{line:15,column:1}},line:13}},branchMap:{},s:{'0':0,'1':0,'2':0,'3':0,'4':0,'5':0,'6':0},f:{'0':0},b:{},_coverageSchema:'332fd63041d2c1bcb487cc26dd0d5f7d97098a6c'},coverage=global[gcv]||(global[gcv]={});if(coverage[path]&&coverage[path].hash===hash){return coverage[path];}coverageData.hash=hash;return coverage[path]=coverageData;}();const StatsD=(cov_2503304m1f.s[0]++,require('hot-shots'));const{logger}=(cov_2503304m1f.s[1]++,require('@spokedev/fab_logger'));const config=(cov_2503304m1f.s[2]++,require('../config'));const metrics=(cov_2503304m1f.s[3]++,new StatsD({host:config.metrics.dogStatsHost,prefix:'getting_started_',suffix:'_total',globalTags:{env:config.environment}}));// Catch socket errors so they don't go unhandled
cov_2503304m1f.s[4]++;metrics.socket.on('error',error=>{cov_2503304m1f.f[0]++;cov_2503304m1f.s[5]++;logger.error({message:'Error in Datadog socket',error});});cov_2503304m1f.s[6]++;module.exports=metrics;