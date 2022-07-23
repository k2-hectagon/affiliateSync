import './App.css';
import {useState, useEffect} from 'react';
import Config from './Config';
import {getEvents} from './utils';

import {init,createContract} from './init';
import {utils} from 'ethers';

const convertToTxnHashObj = function(events) {
  let result = {};
  events.forEach(event => {
    result[event.transactionHash] = event;
  });
  return result;
}

const getBondInfo = async function ({config, bondId}) {
  init(config);
  const bondDepositoryContract = createContract(config.BondDepository);
  let resp = await bondDepositoryContract.markets(bondId);
  return resp;
}

const getCurrentBlockNumber = async function({config}) {
  const obj = init(config)
  if(obj !== undefined){
    const provider = obj.provider;
    return await provider.getBlockNumber();
  }
}

const getBondEventRawData = async function ({fromBlock, toBlock, config}) {
  init(config);
  const bondDepositoryContract = createContract(config.BondDepository);
  const bondFilter = bondDepositoryContract.filters.Bond();
  const events = await getEvents(bondDepositoryContract, bondFilter, fromBlock, toBlock);
  // there is only 1 Bond event per transaction
  return convertToTxnHashObj(events);
}

const getBUSDTransferEvent = async function({fromBlock, toBlock, config}) {
  init(config);
  const bUSDContract = createContract(config.BUSD);
  const toTreasuryFilter = bUSDContract.filters.Transfer(null, config.Treasury.address);
  const toTreasury = await getEvents(bUSDContract, toTreasuryFilter, fromBlock, toBlock);
  const toQuickBondFilter = bUSDContract.filters.Transfer(null, config.QuickBond.address);
  const toQuickBond = await getEvents(bUSDContract, toQuickBondFilter, fromBlock, toBlock);
  const events = [...toTreasury, ...toQuickBond];
  // there is only 1 valid Transfer event per transaction
  return convertToTxnHashObj(events);
}

const commision = function(rev){
  if(rev < 100) {
    return 0.01*rev;
  }else if(rev < 1000) {
    return 0.05*rev;
  }else if(rev < 5000) {
    return 0.07*rev;
  }else {
    return 0.1*rev;
  }
}

function App() {
  const [fromBlock, setFromBlock] = useState(21221347)
  const [noOfBlock, setNoOfBlock] = useState(3000);
  const [currentBlockNumber, setCurrentBlockNumber] = useState(0);
  const [bondEvents, setBondEvents] = useState({});
  const [bonds, setBonds] = useState({});
  const [revenueReceipts, setRevenueReceipts] = useState({});
  const [isLoading, setLoading] = useState(false);
  const [rev, setRev] = useState(0);
  const [refferal, setRefferal] = useState({});
  useEffect(() => {
    const _fetchData = async function() {
      const currentBlockNumber = await getCurrentBlockNumber({config: Config});
      setCurrentBlockNumber(currentBlockNumber);
    }
    _fetchData();
  }, [])
  return (
    <div className="App">
      <h4 style={{color: "#f00"}}>Do not support "Pay by LP token"</h4>
      <table style={{border: "1px solid", marginBottom: "15px"}}>
        <thead style={{backgroundColor: "#0f0"}}>
          <tr>
            <td>Bond type</td>
            <td>BUSD revenue event</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>BUSD Bond</td>
            <td>Transfer event of address BUSD to Treasury</td>
          </tr>
          <tr>
            <td>LP Bond</td>
            <td>Transfer event of address BUSD to QuickBond</td>
          </tr>
        </tbody>
      </table>
      <div>
        From Block:
        <input type="text" value={fromBlock} onChange={(e) => {
          setFromBlock(parseInt(e.target.value));
        }} />
      </div>
      <div>
        No of Block ahead (&lt;3000,rpc limit):
        <input type="text" value={noOfBlock} onChange={(e) => {
          setNoOfBlock(parseInt(e.target.value));
        }} />
      </div>
      <div>
        To Block: {fromBlock+noOfBlock}
      </div>
      <div>
        Current Block: {currentBlockNumber}; Distance to From Block: {currentBlockNumber - fromBlock}
      </div>
      <div>
        <button 
        disabled={isLoading} 
        onClick={async () => {
          if(isLoading === true){
            return;
          }
          setLoading(true);
          const events = await getBondEventRawData({
            fromBlock,
            toBlock:  fromBlock+noOfBlock,
            config: Config
          });
          // in these events, find bonds info
          const hashs = Object.keys(events);
          for(var i=0;i<hashs.length;i++){
            const event = events[hashs[i]]
            const bondId = event.args.id;
            console.log("bondId:",bondId.toString());
            if(bonds[bondId] === undefined){
              bonds[bondId] = await getBondInfo({config: Config, bondId});
            }
          }
          /*
            * - BUSD Bond
            *  - Within this transaction, find Transfer event of address BUSD to Treasury, amount is the revenue
            * - LP Bond 
            * payment token BUSD: https://testnet.bscscan.com/tx/0x15a6f79b1d16110642234e7005c7ea8c9bfae1b7cf446958a26fd0e9ff4a8acc
            * payment token !BUSD: https://testnet.bscscan.com/tx/0x5dd53968a1e45c647af1af3d1cb1defbdfbcb0ba4b834ffd116bbfa28f31f2e0
            *  - Within this transaction, find Transfer event of address BUSD to QuickBond, amount is the revenue
          */
          // get all BUSD Transfer to either Treasury | QuickBond
          const newRevenueReceipts = await getBUSDTransferEvent({fromBlock, toBlock: fromBlock+noOfBlock, config: Config});
          const allBondEvents = {...bondEvents, ...events};
          const allRevenueReceipts = {...revenueReceipts, ...newRevenueReceipts};
          let totalRev = rev;
          Object.keys(newRevenueReceipts).forEach(hash => {
            const rev = parseFloat(utils.formatEther(newRevenueReceipts[hash].args.value));
            const address = allBondEvents[hash].args.referral;
            // TODO: for now all transactions has a refferal!
            if(address !== undefined && address !== null){
              refferal[address] = refferal[address] === undefined ? 0:refferal[address];
              refferal[address] += rev;
            }
            totalRev += rev;
          })
          setRev(totalRev);
          setBonds(bonds);
          setBondEvents(allBondEvents);
          setRevenueReceipts(allRevenueReceipts);
          setLoading(false);
          setFromBlock(fromBlock + noOfBlock);
          setRefferal(refferal);
        }}>Load Event ({fromBlock}) &gt;</button>
      </div>
      
      <div>
        <h2>Events ({Object.keys(bondEvents).length})</h2>
        <h3>Total Rev: {rev} BUSD</h3>
        {isLoading === true ? <h4>loading ...</h4>:null}
        <p>Comission rule: 0-100: 1%; 100-1000:5%; 1000-5000:7%; &gt;5000: 10%</p>
        <table style={{border: "1px solid"}}>
          <thead style={{backgroundColor: "#0f0"}}>
            <tr>
              <td>Refferal address</td>
              <td>Revenue (BUSD)</td>
              <td>Commision (BUSD)</td>
            </tr>
          </thead>
          <tbody>
          {Object.keys(refferal).map((address,idx) => {
            return <tr key={idx}><td>{address}</td><td>{refferal[address]}</td><td>{commision(refferal[address])}</td></tr>
          })}
          </tbody>
        </table>
        <div>
          {Object.keys(bondEvents).map((txnHash,idx) => {
            const event = bondEvents[txnHash];
            // what happen if no revenueReceipt is found?
            return <div className="bond-event" key={idx}>
              <div>
                <div>blockNumber: {event.blockNumber}</div>
                <div>transactionHash: {event.transactionHash}</div>
                <div>logIndex: {event.logIndex}</div>
                <div>amount: {event.args.amount.toString()}</div>
                <div>price: {event.args.price.toString()}</div>
                <div>refferal: {event.args.referral}</div>
                <div>revenue (BUSD): {utils.formatEther(revenueReceipts[txnHash].args.value)}</div>
              </div>
              <div>
                {bonds[event.args.id.toString()].quoteToken === Config.BUSD.address ? "Bond BUSD" : "Bond LP"}
              </div>
            </div>
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
