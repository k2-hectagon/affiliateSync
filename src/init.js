import {ethers} from 'ethers';

var initialized = false;
var provider = null;
var contracts = {};
export const init = function(config){
  if(initialized === true){
    return;
  }
  initialized = true;
  provider = new ethers.providers.JsonRpcProvider(config.rpc);
  return {
    provider
  }
}

export const createContract = function(meta) {
  if(provider === undefined){
    console.error('init first');
    return undefined;
  }
  if(contracts[meta.address] === undefined){
    contracts[meta.address] = new ethers.Contract(meta.address, meta.abi, provider)
  }
  return contracts[meta.address];
}