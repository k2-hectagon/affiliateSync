export const getEvents = async function(contract, ...args) {
  const result = await contract.queryFilter(...args);
  let events = [];
  if(result){
    for(var i=0;i<result.length;i++){
      const {address, blockHash, blockNumber, logIndex, removed, transactionHash, transactionIndex} = result[i];
      const parsed = contract.interface.parseLog(result[i]);
      const {args, name} = parsed;
      events.push({
        address, args, blockHash, blockNumber, name, logIndex, removed, transactionHash, transactionIndex
      });
    }
  }
  return events;
}