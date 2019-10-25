import React from 'react';
import { Events, Blockie, Scaler } from "dapparatus";
import Web3 from 'web3';
import Ruler from "./Ruler";
import axios from "axios"
import i18n from '../i18n';
import i18next from 'i18next';

import NavCard from './NavCard';
import Bottom from './Bottom';
import LiquiditySendByScan from './LiquiditySendByScan'
import LiquidityReceive from './LiquidityReceive'
import LiquiditySendToAddress from './LiquiditySendToAddress'
import LiquidityTransactions from './LiquidityTransactions'
import LiquidityBridge from './LiquidityBridge';
import LiquidityExchange from './LiquidityExchange'

import Balance from "./Balance";

import { NOCUSTManager } from 'nocust-client'

import ethImg from '../images/ethereum.png';
import daiImg from '../images/dai.jpg';

const { toWei, fromWei, toBN } = require('web3-utils');

const HUB_CONTRACT_ADDRESS = process.env.REACT_APP_HUB_CONTRACT_ADDRESS
const HUB_API_URL = process.env.REACT_APP_HUB_API_URL
const RPC_URL = process.env.REACT_APP_RPC_URL
const TEST_DAI_ADDRESS = process.env.REACT_APP_TEST_DAI_ADDRESS

function getDisplayValue(value, decimals=4) {
  const displayVal = fromWei(value.toString(), 'ether');
  if (displayVal.indexOf('.') >= 0){
    return displayVal.substr(0, displayVal.indexOf('.') + decimals + 1);
  }
  return displayVal
}

export default class LiquidityNetwork extends React.Component {

  constructor(props) {
    super(props);

    let limboweb3 = new Web3(new Web3.providers.HttpProvider(RPC_URL))
    limboweb3.eth.accounts.wallet.add(props.privateKey)

    const nocustManager = new NOCUSTManager({
      rpcApi: limboweb3,
      operatorApiUrl: HUB_API_URL,
      contractAddress: HUB_CONTRACT_ADDRESS,
      });

    console.log(nocustManager)

    this.state = {
      toAddress: (props.scannerState ? props.scannerState.toAddress : ""),
      nocustManager: nocustManager,
      address: limboweb3.eth.accounts.wallet[0].address,
      addressRegistered: false,
      blocksToWithdrawal: -1,
      limboweb3: limboweb3,
      view: "main"
    }


    this.checkRegistration().then((addressRegistered) => {
      this.setState({addressRegistered})
      if (!addressRegistered) {
        this.registerWithHub().then(() => {
          this.checkBalance()
        })
      }
    })
  }

  componentDidMount(){

    this.state.nocustManager.subscribeToIncomingTransfer(
      this.state.address,
      tx => {
        console.log(`Incoming transaction from: ${tx.wallet.address} of: ${tx.amount.toString()} wei of token ${tx.wallet.token}.`)
        this.checkBalance()
        this.getTransactions()
      }, 
      'all'
    ).then((unsubscribe) => this.setState({unsubscribe}))
    this.checkBalance()
    this.getTransactions()


    setTimeout(this.longPollInterval.bind(this),30)
    const longPollingIntervalId = setInterval(this.longPollInterval.bind(this),8000)
    this.setState({longPollingIntervalId})
  }
  
  componentWillUnmount(){
    console.log("Unsubscribing from incoming transactions")
    this.state.unsubscribe()

    console.log("No longer polling NOCUST")
    clearInterval(this.state.longPollingIntervalId)
  }

  async checkRegistration(){
    const addressRegistered = await this.state.nocustManager.isAddressRegistered(this.state.address)
    console.log(addressRegistered ? "Already registered" : "Address hasn't registered with the hub")
    this.setState({addressRegistered})
    return addressRegistered 
  }

  async registerWithHub(){
    console.log("Registering with hub")
    this.state.nocustManager.registerAddress(this.state.address)
    this.state.nocustManager.registerAddress(this.state.address, TEST_DAI_ADDRESS)
  }

  async longPollInterval(){
    console.log("LONGPOLL")
    this.checkWithdrawalInfo()
  }

  async checkBalance(){
    const ethBalance = await this.state.nocustManager.getOnChainBalance(this.state.address)
    const fethBalance = await this.state.nocustManager.getNOCUSTBalance(this.state.address)

    const daiBalance = await this.state.nocustManager.getOnChainBalance(this.state.address, TEST_DAI_ADDRESS)
    const fdaiBalance = await this.state.nocustManager.getNOCUSTBalance(this.state.address, TEST_DAI_ADDRESS)
    
    this.setState({ethBalance, daiBalance, fethBalance, fdaiBalance})
    console.log({ethBalance, daiBalance, fethBalance, fdaiBalance})

    // NOCUST uses big-number.js rather than BN.js so need to convert
    const displayEth = getDisplayValue(toBN(ethBalance))
    const displayfEth = getDisplayValue(toBN(fethBalance))
    const displayDai = getDisplayValue(toBN(daiBalance))
    const displayfDai = getDisplayValue(toBN(fdaiBalance))
    this.setState({displayEth, displayfEth, displayDai, displayfDai})
    console.log({displayEth, displayfEth, displayDai, displayfDai})
  }

  async getTransactions() {
    let transactions = await this.state.nocustManager.getTransactionsForAddress(this.state.address, TEST_DAI_ADDRESS)
    if (transactions.length) {
      transactions = transactions.reverse()
    }
    this.setState({transactions})
  }

  async checkWithdrawalInfo () {
    const withdrawFee = await this.state.nocustManager.getWithdrawalFee(toWei(this.props.gwei.toString(), "gwei"))
    const ethWithdrawLimit = await this.state.nocustManager.getWithdrawalLimit(this.state.address, HUB_CONTRACT_ADDRESS)
    const daiWithdrawLimit = await this.state.nocustManager.getWithdrawalLimit(this.state.address, TEST_DAI_ADDRESS)
    const blocksToWithdrawal = await this.state.nocustManager.getBlocksToWithdrawalConfirmation(this.state.address, undefined, HUB_CONTRACT_ADDRESS)

    this.setState({withdrawFee, ethWithdrawLimit, daiWithdrawLimit, blocksToWithdrawal})
  }

  async confirmWithdrawal () {
    const gasLimit = "300000"

    const txhash = await this.state.nocustManager.withdrawalConfirmation(this.state.address, toWei(this.props.gwei.toString(), "gwei"), gasLimit, HUB_CONTRACT_ADDRESS)
    console.log("withdrawal", txhash)
    this.checkBalance()
  }


  changeView (view) {
    this.setState({view}, console.log)
  }

  goBack () {
    this.changeView("main")
  }

  openScanner(returnState){
    this.setState({returnState:returnState,view:"send_by_scan"})
  }

  returnToState(scannerState){
    let updateState = Object.assign({scannerState:scannerState}, this.state.returnState);
    updateState.returnState = false
    console.log("UPDATE FROM RETURN STATE",updateState)
    this.setState(updateState)
  }

  render(){
    
    let sendButtons = (
      <div>
        {typeof this.state.blocksToWithdrawal !== 'undefined' && this.state.blocksToWithdrawal != -1 &&
        <div className="content ops row">
          <div className="col-12 p-1" onClick={() => this.confirmWithdrawal()}>
            <button className={`btn btn-large w-100 ${this.state.blocksToWithdrawal == 0 ? '' : 'disabled'}`} style={this.props.buttonStyle.primary}>
              <Scaler config={{startZoomAt:400,origin:"50% 50%"}}>
                <i className={`fas ${this.state.blocksToWithdrawal == 0 ? 'fa-check' : 'fa-clock'}`}/> {this.state.blocksToWithdrawal == 0 ? i18next.t('liquidity.withdraw.confirm') : this.state.blocksToWithdrawal + " blocks until confirmation"}
              </Scaler>
            </button>
          </div>
        </div>}
        <div className="content ops row">
          <div className="col-6 p-1" onClick={() => this.changeView('receive')}>
            <button className="btn btn-large w-100" style={this.props.buttonStyle.primary}>
              <Scaler config={{startZoomAt:400,origin:"50% 50%"}}>
                <i className="fas fa-qrcode"  /> {i18next.t('main_card.receive')}
              </Scaler>
            </button>
          </div>
          <div className="col-6 p-1">
            <button className="btn btn-large w-100" onClick={() => this.changeView('send_to_address')} style={this.props.buttonStyle.primary}>
              <Scaler config={{startZoomAt:400,origin:"50% 50%"}}>
                <i className="fas fa-paper-plane"/> {i18next.t('main_card.send')}
              </Scaler>
            </button>
          </div>
        </div>
        <div className="content ops row">
          <div className="col-6 p-1" onClick={() => this.changeView('bridge')}>
            <button className="btn btn-large w-100" style={this.props.buttonStyle.secondary}>
              <Scaler config={{startZoomAt:400,origin:"50% 50%"}}>
                <i className="fas fa-hand-holding-usd"/> {i18next.t('liquidity.bridge.title')}
              </Scaler>
            </button>
          </div>
          <div className="col-6 p-1" onClick={() => this.changeView('tex')}>
            <button className="btn btn-large w-100" style={this.props.buttonStyle.secondary}>
              <Scaler config={{startZoomAt:400,origin:"50% 50%"}}>
                <i className="fas fa-random"/> {i18next.t('exchange_title')}
              </Scaler>
            </button>
          </div>
        </div>
      </div>
    )

    switch(this.state.view){
      case 'main':
        return (
          <div className="send-to-address card w-100" style={{zIndex:1}}>
            <div className="form-group w-100">

              <div style={{width:"100%",textAlign:"center"}}>
                <Balance
                      icon={daiImg}
                      selected={true}
                      text="fDAI"
                      amount={this.state.displayfDai}
                      address={this.props.account}
                      dollarDisplay={(balance)=>{return balance}}
                    />
                <Ruler/>
                <Balance
                      icon={daiImg}
                      selected={true}
                      text="DAI"
                      amount={this.state.displayDai}
                      address={this.props.account}
                      dollarDisplay={(balance)=>{return balance}}
                    />
                <Ruler/>
                <Balance
                      icon={ethImg}
                      selected={true}
                      text="fETH"
                      amount={this.state.displayfEth}
                      address={this.props.account}
                      dollarDisplay={(balance)=>{return balance}}
                    />
                <Ruler/>
                <Balance
                      icon={ethImg}
                      selected={true}
                      text="ETH"
                      amount={this.state.displayEth}
                      address={this.props.account}
                      dollarDisplay={(balance)=>{return balance}}
                    />
                <Ruler/>

                {sendButtons}

                </div>
                <LiquidityTransactions
                  dollarDisplay={(balance)=>{return balance}}
                  view={this.state.view}
                  buttonStyle={this.props.buttonStyle}
                  changeView={this.changeView.bind(this)}
                  changeAlert={this.props.changeAlert.bind(this)}
                  address={this.state.account}
                  recentTxs={this.state.transactions}
                />
            </div>
        </div>
      )
      case 'bridge':
        return (
          <div>
            <div className="main-card card w-100" style={{zIndex:1}}>
              <NavCard title={i18n.t('liquidity.bridge.title')} goBack={this.goBack.bind(this)}/>
              Withdrawal Fee: {typeof this.state.withdrawFee !== 'undefined' ? fromWei(this.state.withdrawFee.toString(), 'ether').toString() : 0} ETH
              <Ruler/>
              <LiquidityBridge
                text={"ETH"}
                image={ethImg}
                tokenAddress={HUB_CONTRACT_ADDRESS}
                address={this.state.address}
                buttonStyle={this.props.buttonStyle}
                nocust={this.state.nocustManager}
                ethBalance={this.state.ethBalance}
                onchainBalance={this.state.ethBalance}
                offchainBalance={this.state.fethBalance}
                onchainDisplay={this.state.displayEth}
                offchainDisplay={this.state.displayfEth}
                gasPrice={toWei(this.props.gwei.toString(), "gwei")}
                withdrawLimit={this.state.ethWithdrawLimit}
              />
              <Ruler/>
              <LiquidityBridge
                text={"DAI"}
                image={daiImg}
                tokenAddress={TEST_DAI_ADDRESS}
                address={this.state.address}
                buttonStyle={this.props.buttonStyle}
                nocust={this.state.nocustManager}
                ethBalance={this.state.ethBalance}
                onchainBalance={this.state.daiBalance}
                offchainBalance={this.state.fdaiBalance}
                onchainDisplay={this.state.displayDai}
                offchainDisplay={this.state.displayfDai}
                gasPrice={toWei(this.props.gwei.toString(), "gwei")}
                withdrawLimit={this.state.daiWithdrawLimit}
              />
            </div>
            <Bottom
              action={this.goBack.bind(this)}
            />
          </div>
        )
      case 'tex':
        return (
          <div>
            <div className="main-card card w-100" style={{zIndex:1}}>
              <NavCard title={i18n.t('exchange_title')} goBack={this.goBack.bind(this)}/>
              <LiquidityExchange
                assetAText={"fETH"}
                assetBText={"fDAI"}
                assetAAddress={HUB_CONTRACT_ADDRESS}
                assetBAddress={TEST_DAI_ADDRESS}
                assetAImage={ethImg}
                assetBImage={daiImg}
                assetABalance={this.state.fethBalance}
                assetBBalance={this.state.fdaiBalance}
                assetADisplay={this.state.displayfEth}
                assetBDisplay={this.state.displayfDai}
                address={this.state.address}
                buttonStyle={this.props.buttonStyle}
                nocust={this.state.nocustManager}
              />
            </div>
            <Bottom
              action={this.goBack.bind(this)}
            />
          </div>
        )
      case 'receive':
        return (
          <div>
            <div className="main-card card w-100" style={{zIndex:1}}>

              <NavCard title={i18n.t('receive_title')} goBack={this.goBack.bind(this)}/>
              <LiquidityReceive
                hubContract={HUB_CONTRACT_ADDRESS}
                hubApiUrl={HUB_API_URL}
                dollarDisplay={(balance)=>{return balance}}
                view={this.state.view}
                block={this.state.block}
                ensLookup={this.props.ensLookup}
                buttonStyle={this.props.buttonStyle}
                balance={this.props.balance}
                address={this.state.address}
                changeAlert={this.props.changeAlert}
              />
            </div>
            <Bottom
              action={this.goBack.bind(this)}
            />
          </div>
        )
      case 'send_to_address':
        return (
          <div>
            <div className="send-to-address card w-100" style={{zIndex:1}}>
            
              <NavCard title={i18n.t('send_to_address_title')} goBack={this.goBack.bind(this)}/>
              <Balance
                icon={daiImg}
                selected={true}
                text="fDAI"
                amount={this.state.displayfDai}
                address={this.props.account}
                dollarDisplay={(balance)=>{return balance}}
              />
              <Ruler/>
              <LiquiditySendToAddress
                nocustManager={this.state.nocustManager}
                convertToDollar={(dollar) => {return dollar}}
                dollarSymbol={"$"}
                text={"fDAI"}
                parseAndCleanPath={this.props.parseAndCleanPath}
                openScanner={this.openScanner.bind(this)}
                scannerState={this.state.scannerState}
                ensLookup={this.props.ensLookup}
                buttonStyle={this.props.buttonStyle}
                offchainBalance={this.state.fdaiBalance}
                tokenAddress={TEST_DAI_ADDRESS}
                address={this.state.address}
                goBack={this.goBack.bind(this)}
                // changeView={this.props.changeView}
                setReceipt={this.props.setReceipt}
                changeAlert={this.props.changeAlert}
                dollarDisplay={(balance)=>{return balance}}
                onSend={() => {
                  setTimeout(() => {
                    this.checkBalance()
                    this.getTransactions()
                  }, 2000)
                }}
              />
            </div>
            <Bottom
              action={this.goBack.bind(this)}
            />
          </div>
        )
      case 'send_by_scan':
        return (
          <LiquiditySendByScan
          parseAndCleanPath={this.props.parseAndCleanPath}
          returnToState={this.returnToState.bind(this)}
          returnState={this.state.returnState}
          mainStyle={this.props.mainStyle}
          goBack={this.goBack.bind(this)}
          changeView={this.changeView.bind(this)}
          onError={(error) =>{
            this.props.changeAlert("danger",error)
          }}
          />
        );
    }

  }
}
