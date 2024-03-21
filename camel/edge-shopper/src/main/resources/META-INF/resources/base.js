let clientMqtt;

let inflightZipData = 0;
let totalZipFiles   = 0;
let totalRenderingZipFiles = 0;
let pendingZipSend  = 0;
let pendingUnzipFile= 0;
// let totalUnzipFiles = 0;
let zipInMotion = false;

const S3_EDGE           = 4.75
const S3_CENTRAL        = 17.75
const S3_CENTRAL_MODELS = 26.75

let pipeTimerInterval = null;

var monitorQueue = [] 

function initMqtt(){

    var brokerHost = window.location.hostname.replace("camel-edge", "broker-amq-mqtt")
    // var brokerHost = window.location.hostname.replace("camel-edge", "broker-amq-hdls-svc")
    var brokerPort = window.location.port 
    const brokerUrl=window.location.href+"/test"
    
    var brokerOptions = null
    
    //For local testing: when loading the page directly on the browser
    if (brokerHost == ""){
        brokerHost = "localhost"
        brokerPort = "8080"
    }
    
    //For local testing
    if (brokerPort == "8080"){
        brokerPort = "1883"
        brokerOptions = {onSuccess:onConnect}
    }
    else{
        brokerPort = "443"
        // brokerOptions = {useSSL:true,onSuccess:onConnect, onFailure:onFailure, onMessageArrived: onMessageArrived, onConnectionLost: onConnectionLost}
        brokerOptions = {useSSL:true,onSuccess:onConnect, onFailure:onFailure}
    }
    
    let uid = Date.now().toString(36) + Math.random().toString(36).substr(2)

    // Create a client instance
    clientMqtt = new Paho.MQTT.Client(brokerHost, Number(brokerPort), "MonitorClient-"+uid);
    
    // set callback handlers
    clientMqtt.onConnectionLost = onConnectionLost;
    // clientMqtt.onMessageArrived = onMessageArrived;
    
    // connect the client
    clientMqtt.connect(brokerOptions);

    // Reconnect mechanism in case MQTT connection is lost
    const interval = setInterval(function() {
      if(!clientMqtt.isConnected()){
          console.log("MQTT: attempting reconnect.");
          //somehow this field is automatically created on first connect
          //we need to remove it, otherwise it won't reconnect.
          delete brokerOptions.mqttVersionExplicit
          clientMqtt.connect(brokerOptions);
      }
      // method to be executed;
    }, 1000);
}

// called when the MQTT client connects
function onConnect() {
    console.log("MQTT: connected to broker");
    clientMqtt.onMessageArrived = onMessageArrived;
    clientMqtt.subscribe("monitor", 1);
}

function onConnectionLost(responseObject){
    console.log("MQTT: connection lost");
}

function onFailure(responseObject){
    console.log("MQTT: failure");
}

function onMessageArrived(msg){
    console.log("MQTT message: "+msg.payloadString);

    let message = JSON.parse(msg.payloadString)

    console.log("MQTT message: "+message.origin);

    //When message is an MQTT inference response
    if(message.origin == "mqtt"){
        consumeMqttEvent(num++, message)
    }
    //For monitoring events
    else{
      processMqttMonitorMessage(message)
    }
}

function processMqttMonitorMessage(message){

    //When message is an MQTT inference response
    if(message.origin == "mqtt"){
        consumeMqttEvent(num++, message)
    }
    //For monitoring events
    else{
      console.log("name: "+message.name);

      //No queuing for detection/ingestion
      if(message.name == "detection"){
        // consumeHttpEvent("1", process)
        consumeHttpEvent(num++, message)
      }
    }
}


        function initWebSocket() {

        	var ws;
            
            if ("WebSocket" in window) {
               console.log("WebSocket is supported by your Browser!");
               
               // Let us open a web socket
               //var ws = new WebSocket("ws://localhost:9998/echo");
               ws = new WebSocket(((window.location.protocol === 'https:') ? 'wss://' : 'ws://') + window.location.host + '/camel/eventOffset');
             //localhost:8080/myapp/mysocket
    			
               ws.onopen = function() {
                  //nothing to do
               };
    			
               ws.onclose = function() {
                  // websocket is closed.
                  console.log("Connection is closed..."); 
               };
            } else {
               // The browser doesn't support WebSocket
               alert("WebSocket NOT supported by your Browser!");
            }

            return ws;
         }


      function startConsumer()
      {
        let scene = document.getElementById("scene");

        // Camel (infer/ingest)
        let pipe = document.createElement('a-box')
        pipe.setAttribute('position', {x: 0, y: 0, z: 0})
        pipe.setAttribute('height', .7)
        pipe.setAttribute('width' , 6)
        pipe.setAttribute('depth' , .3)
        pipe.setAttribute('side', "double")
        pipe.setAttribute('color', "grey")
        pipe.setAttribute('opacity', ".5")
        
        scene.appendChild(pipe)
        
        var processor = document.createElement('a-text')
        processor.setAttribute('value', 'Camel - Infer/Ingest')
        processor.setAttribute('scale', "2 2 2")
        processor.setAttribute('align', 'center')
        processor.setAttribute('color', 'grey')
        scene.appendChild(processor);
        processor.setAttribute('position', {y: -0.7, z:.1})
      }


      function sendMessage(protocol)
      {
        let scene = document.getElementById("scene");

        let process = {
            // origin: "mqtt",
            origin: protocol,
            valid: true,
            // valid: false,
            price: 500
        }

      //   consumeEvent(item)
        // consumeMqttEvent(item, process)

        if(protocol == "mqtt")
          consumeMqttEvent(num, process)
        else if(protocol == "http")
          consumeHttpEvent(num, process)
        
        num++
      }


      function setCameraFocus(xpos, duration){

        res1 = typeof("")
        res2 = typeof({})

        console.log("test: "+res1)
        console.log("test2: "+res2)

        if(res2 == "object")
          console.log("res2 is object!")


        duration = duration || '3000'

        let camera = document.getElementById("main-camera");

        let target = {x: xpos, y:0, z:8}

        if(typeof(xpos) == "object")
          target = xpos
        
        camera.setAttribute(
            'animation',
            {  property: 'position', 
               // dur: '3000', 
               dur: duration, 
               delay: 0, 
               to: target,
               // easing: 'easeOutQuad'
               easing: 'easeInOutQuad'
            });

           //listens animation end
          camera.addEventListener('animationcomplete', function cleanAnimation(evt) {

            let pos = this.getAttribute("position").x
            
            if (pos == xpos)
            {
                //delete listener
                this.removeEventListener('animationcomplete', cleanAnimation);

                //delete animation
                this.removeAttribute('animation');
            }
          });
      }


      function consumeHttpEvent(item, process)
      {
        posY = 0;
        var msg;
      
        msg = document.createElement('a-box')
        msg.setAttribute('position', {x: -8, y: 0, z: 0})
        msg.setAttribute('height', .5)
        msg.setAttribute('width' , .5)
        msg.setAttribute('depth' , .2)
        msg.setAttribute('side', "double")
        msg.setAttribute('color', "grey")
        // msg.setAttribute('opacity', ".9")


        var number = document.createElement('a-text')
        number.setAttribute('value', item)
        // number.setAttribute('value', "1")
        number.setAttribute('align', 'center')
        number.setAttribute('scale', "2 2 2")
        msg.appendChild(number);
        number.setAttribute('position', {z: 0.148})

        let target = {  x: -4+.6,
                        y: 0, 
                        z: 0}
        
        msg.setAttribute(
            'animation',
            {  property: 'position', 
               dur: '1000', 
               delay: 0, 
               to: target,
               easing: 'easeOutQuad'
            });
       

            from = target;
        
            target = {  x: 0,
                        y: 0, 
                        z: 0}
      
              msg.setAttribute(
                'animation__2',
                {  property: 'position', 
                   dur: '2000', 
                   delay: 950, 
                   from: from,
                   to: target,
                   // easing: 'easeOutQuad'
                });
        

          
          //listens animation end
          msg.addEventListener('animationcomplete', function cleanAnimation(evt) {

            console.log("name detail: "+ evt.detail.name)
        	  // console.log("event detail: "+ evt)
        	  
        	  let pos = this.getAttribute("position").x
        	  
            if (pos == 0)
        	  {
	              //delete listener
	              this.removeEventListener('animationcomplete', cleanAnimation);
	
	              //delete animation
	              this.removeAttribute('animation');
	              
                consumeHttpEventPhase2(item, this, process)
        	  }
          }); 
 
        scene.appendChild(msg);        
      }
      

      //Renders events going to the AI engine
      function consumeHttpEventPhase2(item, msgOriginal, process)
      {
        posY = 0;
        var msg;

        msg = document.createElement('a-box')
        msg.setAttribute('position', {x: 0, y: 0, z: 0})
        msg.setAttribute('height', .5)
        msg.setAttribute('width' , .5)
        msg.setAttribute('depth' , .2)
        msg.setAttribute('side', "double")
        msg.setAttribute('color', "grey")

        var number = document.createElement('a-text')
        number.setAttribute('value', item)
        number.setAttribute('align', 'center')
        number.setAttribute('scale', "2 2 2")
        msg.appendChild(number);
        number.setAttribute('position', {z: 0.148})
     
        let target = {  x: 0,
                        y: 3, 
                        z: 0}
        
        msg.setAttribute(
            'animation',
            {  property: 'position', 
               dur: '1000', 
               delay: 0, 
               to: target,
               easing: 'easeOutQuad'
            });
       
          
          //listens animation end
          msg.addEventListener('animationcomplete', function cleanAnimation(evt) {


        	  let pos = this.getAttribute("position").x
        	  
            if (pos == 0)
        	  {
	              //delete listener
	              this.removeEventListener('animationcomplete', cleanAnimation);
	
	              //delete animation
	              this.removeAttribute('animation');
	              
	              this.parentElement.removeChild(this);

                aiResult(item, msgOriginal, process)

                if(process.valid){
                    queryPrice(item, msgOriginal, process)
                }
                else{
                    consumeHttpEventPhase3(item, msgOriginal, process)
                }
        	  }
          }); 
          
        scene.appendChild(msg);
      }


      function aiResult(item, msgOriginal, process)
      {
        posY = 0;
        let msg;

        msg = document.createElement('a-image')
        msg.setAttribute('position', {x: 2, y: 3, z: 0})

        if(process.valid){
            msg.setAttribute('src', "#valid")
        }
        else{
            msg.setAttribute('src', "#invalid")
        }
        
        msg.setAttribute('scale', ".8 .8 .8")

        var number = document.createElement('a-text')
        // number.setAttribute('value', item)
        
        if(process.valid){
            number.setAttribute('value', "valid")
        }
        else{
            number.setAttribute('value', "invalid")
        }
        
        number.setAttribute('position', {x: .5, y: 0, z: 0})
        number.setAttribute('scale', "4 4 4")
        msg.appendChild(number);
        
        let target = {  
            x: 0,
            y: 0, 
            z: 0}

        msg.setAttribute(
            'animation',
            {  property: 'opacity', 
               dur: '2000', 
               delay: 0, 
               from: 1,
               to: 0,
               easing: 'easeOutQuad'
            });
       
            //text label child
            msg.firstChild.setAttribute(
              'animation',
              {  property: 'opacity', 
                 dur: '2000', 
                 delay: 0, 
                 from: 1,
                 to: 0,
                 easing: 'easeOutQuad'
              });

          
          //listens animation end
          msg.addEventListener('animationcomplete', function cleanAnimation(evt) {

        	  let pos = this.getAttribute("scale").y
        	  
            //delete listener
            this.removeEventListener('animationcomplete', cleanAnimation);

            //delete animation
            this.removeAttribute('animation');
            
            this.parentElement.removeChild(this);
              consumeHttpEventPhase3(item, msgOriginal, process)

          }); 
          
        scene.appendChild(msg);
      }


      //Renders events going to the AI engine
      function queryPrice(item, msgOriginal, process)
      {
        posY = 0;
        let msg;

        msg = document.createElement('a-box')
        msg.setAttribute('position', {x: 0, y: 0, z: 0})
        msg.setAttribute('height', .5)
        msg.setAttribute('width' , .5)
        msg.setAttribute('depth' , .2)
        msg.setAttribute('side', "double")
        msg.setAttribute('color', "grey")
        
        var number = document.createElement('a-text')
        number.setAttribute('value', item)
        number.setAttribute('align', 'center')
        number.setAttribute('scale', "2 2 2")
        msg.appendChild(number);
        number.setAttribute('position', {z: 0.148})
    
        let target = {  x: 0,
                        y: -3, 
                        z: 0}
        
        msg.setAttribute(
            'animation',
            {  property: 'position', 
               dur: '1000', 
               delay: 0, 
               to: target,
               easing: 'easeOutQuad'
            });
       
          
          //listens animation end
          msg.addEventListener('animationcomplete', function cleanAnimation(evt) {


        	  let pos = this.getAttribute("position").y

            //delete listener
            this.removeEventListener('animationcomplete', cleanAnimation);

            //delete animation
            this.removeAttribute('animation');
            
            this.parentElement.removeChild(this);
            consumeHttpEventPhase3(item, msgOriginal, process)
            priceResult(item, msgOriginal, process)
    	  
          }); 

        scene.appendChild(msg);
      }


      function priceResult(item, msgOriginal, process)
      {
        posY = 0;
        var msg;

        msg = document.createElement('a-entity')
        msg.setAttribute('position', {x: .5, y: -3, z: 0})

        var number = document.createElement('a-text')
        number.setAttribute('value', process.price)
        number.setAttribute('position', {x: 0.5, y: 0, z: 0})
        number.setAttribute('color', "yellow")
        number.setAttribute('scale', "4 4 4")
        msg.appendChild(number);
     
        let target = {  x: 0,
                        y: 0, 
                        z: 0}
        
        msg.setAttribute(
            'animation',
            {  property: 'opacity', 
               dur: '5000', 
               delay: 0, 
               from: 1,
               to: 0,
               easing: 'easeOutQuad'
            });
       
            //text label child
            msg.firstChild.setAttribute(
              'animation',
              {  property: 'opacity', 
                 dur: '5000', 
                 delay: 0, 
                 from: 1,
                 to: 0,
                 easing: 'easeOutQuad'
              });
          
          //listens animation end
          msg.addEventListener('animationcomplete', function cleanAnimation(evt) {

        	  let pos = this.getAttribute("scale").z
        	  
            if (pos == 0)
        	  {
	              //delete listener
	              this.removeEventListener('animationcomplete', cleanAnimation);
	
	              //delete animation
	              this.removeAttribute('animation');
	              
	              this.parentElement.removeChild(this);
                consumeHttpEventPhase3(item, msgOriginal, process)
        	  }
          }); 
          
        scene.appendChild(msg);  
       
      }


      function consumeHttpEventPhase3(item, msg, process)
      {
        posY = 0;


            let from = {  x: 0,
                            y: 0, 
                            z: 0}
                    
            if(process.name == "ingest"){
              from.x = -4+.6
            }

            target = {  x: 4-.6,
                y: 0, 
                z: 0}


              msg.setAttribute(
                'animation',
                {  property: 'position', 
                   dur: '2000', 
                   delay: 0, 
                   from: from,
                   to: target,
                   // easing: 'easeOutQuad'
                });
        
            //default red (invalid)
            let color = '#FF0000'

            if(process.valid){
                color = '#00FF00'
            }

          msg.setAttribute(
            'animation__color',
            {  property: 'color', 
               dur: '2000', 
               delay: 0,
               from: '#808080',
               to: color,
               // easing: 'easeOutQuad'
            });
        
          
          posY = 1.5

          let to = {
            x: S3_EDGE,
            y: -1.5, 
            z: 0
          }

          if(process.valid){
            to.y = 1.5
          }

          msg.setAttribute(
            'animation__2',
            {  property: 'position', 
               dur: '1000', 
               delay: 1950, 
               from: target,
               to: to,
               // easing: 'easeOutQuad'
            });
          
          
          //listens animation end
          msg.addEventListener('animationcomplete', function cleanAnimation(evt) {

        	  let pos = this.getAttribute("position").x
        	  
            if (pos == S3_EDGE)
        	  {
	              //delete listener
	              this.removeEventListener('animationcomplete', cleanAnimation);
	
	              //delete animation
	              this.removeAttribute('animation');
	              
	              this.parentElement.removeChild(this);
        	  }
          }); 
      }
