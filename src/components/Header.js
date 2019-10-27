import React from 'react';
import { useHistory, useLocation, Link } from "react-router-dom";
import { Scaler, Blockie } from "dapparatus";
import burnerloader from '../burnerloader.gif';

export  default ({openScanner, network, total, dollarDisplay, ens, title, titleImage, mainStyle, balance, address}) => {
  
  let history = useHistory();
  let location = useLocation();


  let name = ens
  if(!name){
    name = address.substring(2,8)
  }

  let moneyDisplay
  let blockieDisplay
  if(typeof total == "undefined" || Number.isNaN(total)){
    moneyDisplay = (
      <div style={{opacity:0.1,fontSize:28,paddingTop:15}}>
        connecting...
      </div>
    )
    blockieDisplay = (
      <div>
        <img src ={burnerloader} style={{maxHeight:50,opacity:0.25,marginLeft:-20}}/>
      </div>
    )
  }else{
    /*moneyDisplay = (
      <div>
        {dollarDisplay(total)}
      </div>
    )*/
    moneyDisplay = (
      <div style={{opacity:0.4,fontSize:22,paddingTop:18}}>
        {network}
      </div>
    )
    blockieDisplay = (
      <Blockie
          address={address}
          config={{size:6}}>
      </Blockie>
    )
  }

  let sendButtonOpacity = 1.0


  let scanButtonStyle = {
    opacity:sendButtonOpacity,
    position:"fixed",
    right:20,
    bottom:20,
    zIndex:2,
    cursor:"pointer"
  }

  let bottomRight = (
    <Link to={{pathname:"/scanner", search: location.search}} style={scanButtonStyle} >
      <div style={{position:'relative',backgroundImage:"linear-gradient("+mainStyle.mainColorAlt+","+mainStyle.mainColor+")",backgroundColor:mainStyle.mainColor,borderRadius:"50%",width:89,height:89,boxShadow: "0.5px 0.5px 5px #000000"}}>
        <div  style={{color:'#FFFFFF',position:'absolute',left:30,top:28}}>
          <i className="fas fa-qrcode" />
        </div>
      </div>
    </Link>
  )

  let topLeft
  let opacity = 0.5
  
  if(location.pathname !== "/liquidity/receive"){
    opacity = 1.0
    topLeft = (
      <div style={{zIndex:-2,position:"absolute",left:16,top:4,zIndex:1,cursor:"pointer"}} onClick={() => history.push("/liquidity/receive")} >
          {blockieDisplay} <div style={{position:"absolute",left:60,top:15,fontSize:14}}>{name}</div>
      </div>
    )
  }else{
    topLeft = (
      <div style={{zIndex:-2,position:"absolute",left:16,top:4,zIndex:1,cursor:"pointer"}} onClick={() => history.goBack()} >
          {blockieDisplay} <div style={{position:"absolute",left:60,top:15,fontSize:14}}>{name}</div>
      </div>
    )
  }

  let topRight = (
    <div style={{zIndex:-2,position:"absolute",right:28,top:-4,zIndex:1,fontSize:46,opacity:0.9}}  >
      {moneyDisplay}
    </div>
  )

  let lossWarning = ""
  /*
  let context = document.getElementById("context").innerHTML
  console.log("context",context,"balance",balance)
  if(context=="INCOGNITO" && balance>0){
    lossWarning =  (
      <div style={{marginTop:50, fontSize:28}}>
        WARNING: If you close this window you will lose these funds.
      </div>
    )
  }*/

  return (
    <div className="header" style={{opacity}}>
      {topLeft}
      {topRight}
      {lossWarning}
      {bottomRight}
    </div>
  )
};
