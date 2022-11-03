const imAppId = "0e3606b8a6304b45b14c73c629cfbbed";
const imHost = "wss://mc.test.seewo.com";
const userId = getRandomNum(); //getSearchQuery("uid");
const roomId = 281475002171191; // 281475001920405

const options = {
  host: imHost,
  appid: imAppId,
  uid: userId,
  platform: 4,
  auth: {
    user: {
      timestamp: Date.now(),
    },
  },
};

const im = new MsSDK.IM();
im.init(options)
  .login()
  .onConnect((data) => {
    console.log(data);

    // im.createRoom({
    //   data:{
    //     name: 'live-p2p-demo',
    //     is_notify: 1
    //   },
    //   onSuccess: (data, context) => {
    //     if (0 !== data.code) {
    //       console.error('[IM] > 加入房间失败', data, context);

    //       if (data.code === 60302) {
    //           console.error('在线人数过多，请稍后重试', 2);
    //       }
    //       return;
    //     }

    //     console.log('[IM] > 加入房间成功', data, context);

    //     console.log('[IM] > mounted');
    //   },
    //   onFail: (data, context) => {
    //     console.error('[IM] > 加入房间失败', data, context);
    //   },
    //   onTimeout: (data, context) => {
    //     console.error('[IM] > 加入房间超时', data, context);
    //   },
    // })

    im.joinRoom({
      data: {
        roomid: roomId,
      },
      onSuccess: (data, context) => {
        if (0 !== data.code) {
          console.error("[IM] > 加入房间失败", data, context);

          if (data.code === 60302) {
            console.error("在线人数过多，请稍后重试", 2);
          }
          return;
        }

        console.log("[IM] > 加入房间成功", data, context);

        console.log("[IM] > mounted");

        im.getRoomMember({
          data: { roomid: roomId },
          onSuccess: (data, context) => {
            const member = data.member;
            Events.fire(
              "peers",
              member.filter(x=>x.uid!==userId).map((x) => {
                return {
                  id: x.uid,
                  rtcSupported: true,
                  name: {
                    browser: "Chrome",
                    deviceName: "Windows Chrome",
                    displayName: x.uid,
                    os: "Windows",
                  },
                };
              })
            );
            console.log("[IM] > getRoomMember", data, context);

            Events.fire('display-name', {message:{
              deviceName: 'Chrome',
              displayName: userId,
            }});
          },
        });

        im.onMessageRecv((data, context) => {
          console.log("[IM] > onMessageRecv", data, context);

          const msg = {
            sender: data.from_id,
            ...data.msg_body
          }
          Events.fire('signal', msg);
        });

        im.onNoticeRecv((data, context) => {
          console.log("[IM] > onNoticeRecv", data, context);

          if (data.notify_id === 200) {
            Events.fire("peer-joined", {
              id: data.notify_data.uid,
              rtcSupported: true,
              name: {
                browser: "Chrome",
                deviceName: "Windows Chrome",
                displayName: data.notify_data.uid,
                os: "Windows",
              },
            });
          } else if (data.notify_id === 201) {
            Events.fire("peer-left", data.notify_data.uid);
          }
        });
      },
      onFail: (data, context) => {
        console.error("[IM] > 加入房间失败", data, context);
      },
      onTimeout: (data, context) => {
        console.error("[IM] > 加入房间超时", data, context);
      },
    });
  })
  .onDisconnect((data) => {
    console.log("[IM] > disconnected", data);
  });

function getSearchQuery(variable) {
  if (!variable) return null;
  var search = window.location.search;
  var query = search.substring(1);
  var vars = query.split("&");
  var value = "";
  for (var i = 0, len = vars.length; i < len; i++) {
    var pair = vars[i].split("=");
    if (pair[0] == variable) {
      value = pair[1];
      break;
    }
  }
  return decodeURIComponent(value);
}


function getRandomNum() {
  var chars = '0123456789';
  var nums = '';
  for (var i = 0; i < 4; i++) {
      var id = parseInt((Math.random() * 10).toString());
      nums += chars[id];
  }
  return nums;
}