Photon Client JavaScript SDK readme.
(C) Exit Games GmbH 2017


Overview 
----------------------------------------------------------------------------------------------------
The Photon JavaScript library provides a simple to use framework to access the Photon Server
and the Photon Cloud. It works on many up to date browsers using either native WebSocket or 
a Flash plugin.
Cross platform communication is possible, so JavaScript clients can send events to DotNet 
or native clients. This might require some adjustments on other platforms. This is shown by the 
"Particle" demo. The SDK supports 2 APIs.


LoadBalancing API (Photon Realtime)
----------------------------------------------------------------------------------------------------
LoadBalancing API allows to access Photon Cloud Realtime service as well as 
Photon Server LoadBalancing Application:
https://doc.photonengine.com/en-us/realtime/current/getting-started/realtime-intro
https://doc.photonengine.com/en-us/onpremise/current/applications/LoadBalancing/application


Chat API
----------------------------------------------------------------------------------------------------
Chat API allows to access Photon Chat service:
https://doc.photonengine.com/en-us/chat/current/getting-started/chat-intro


Documentation
----------------------------------------------------------------------------------------------------
The reference documentation is in this package. Follow links per API above for more documentation 
for Photon development.


Download
----------------------------------------------------------------------------------------------------
The latest version of JavaScript SDK can be found at
https://www.photonengine.com/Realtime/Download


Contact
----------------------------------------------------------------------------------------------------
To get in touch with other Photon developers and our engineers, visit our Developer Forum:
http://forum.photonengine.com
Keep yourself up to date following Exit Games on Twitter http://twitter.com/exitgames
and our blog at http://blog.photonengine.com


Package Contents
----------------------------------------------------------------------------------------------------
- license.txt         - the license terms
- install.txt         - installation info
- readme.txt          - this readme text
- release_history.txt - release history
- /doc                - the JavaScript API reference documentation
- /lib                - the different versions of the lib
- /src    
  -  /demo-loadbalancing     - basic Realtime application (LoadBalancing API) demo
  -  /demo-particle          - demo showing more of the LoadBalancing API's features
  -  /demo-pairs-mc          - Turnbased application demo
  -  /demo-chat-api          - demo showing Photon Chat API's features
  -  /Photon                 - library TypeScript source files
  -  PhotonWebsockets.sln    - Visual Studio solution file for samples TypeScript projects
                              (Typescript minimal version 1.0.0.0 required)