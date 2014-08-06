;
(function(tvp, $) {

	if(tvp.BaseHtml5){
		return;
	}
	/**
	 * 统一播放器HTML5内核基类
	 * @class tvp.BaseHtml5
	 * @extends tvp.BasePlayer
	 */
	tvp.BaseHtml5 = function() {
		this.protectedFn = {},
		this.h5EvtAdapter = {},
		this.eventList = this.eventList.concat(["html5error"]),
		this.html5AttrList = {
			/**
			 * 自动播放
			 */
			"autoplay": "autoplay",
			/**
			 * 支持AirPlay
			 */
			"x-webkit-airplay": "isHtml5UseAirPlay",
			"webkit-playsinline":"isiPhoneShowPlaysinline"
		};
		this.$videomod = null;
	};

	tvp.BaseHtml5.fn = tvp.BaseHtml5.prototype = new tvp.BasePlayer();

	$.extend(tvp.BaseHtml5.fn, {
		/**
		 * 获取当前的video标签对象
		 * @override
		 * @public
		 */
		getPlayer: function() {
			return this.videoTag;
		},
		/**
		 * 获得当前播放器内核类别
		 * @return {type} 当前播放器内核类别
		 */
		getPlayerType: function() {
			return "html5";
		},
		/**
		 * 生成Video标签的HTML代码
		 * @public
		 */
		createVideoHtml: function() {
			this.playerid = this.config.playerid;
			if (!this.playerid) {
				this.playerid = "tenvideo_video_player_" + (tvp.BaseHtml5.maxId++);
			}
			var str = ['<video id="', this.playerid, '" width="100%" height="100%" '].join(""),
				$me = this;

			if (this.config.isHtml5UseUI) {
				//本身ios不允许div浮层罩在video标签上方，否则只能看到浮层但无法点击
				//在iPad上可以禁止control属性，这样就可以点击了。
				//但这招对iPhone无效，应该是iPhone播放特性使然
				//解决的方案是先把播放器移到屏幕外比如-200%的地方，播放的时候iphone会自动将视频全屏播放，默认特性
				if (($.os.iphone || $.os.ipod) && !! this.config.isIOSVideoOffset) {
					str += 'style="position:absolute;top:-200%;left:-200%"';
				}
			}
			
			//解决android手机第一次加载页面时闪现灰色背景的问题
			if(this.config.isHtml5UseUI && this.config.isHtml5ShowPosterOnStart && $.os.android){
				if(!$.browser.UC){
					str += 'style="position:absolute;top:-200%;"';
				}
				else {
					str += 'style="position:absolute;left:-200%;"';
				}
				setTimeout(function(){
					if($me.videoTag && $me.$video.size() == 1){
						var isReset = false;
						$me.$video.one("playing",function(){
							if(isReset){
								return ;
							}
							isReset = true;
							$me.videoTag.style.cssText = "";
						}).one("tvp:h5ui:playbtn:click",function(){
							if(isReset){
								return ;
							}
							isReset = true;
							$me.videoTag.style.cssText = "";
						});
					}
				},100);
			}

			for (var p in this.html5AttrList) {
				str += " ";
				var cfgKey = this.html5AttrList[p],
					cfgVal = "";
				if (cfgKey == "") {
					cfgVal = "";
				} else {
					if (!(cfgKey in this.config)) continue; //给的配置在全局配置项里根本就没有对应的属性值，鬼知道该输出啥，跳过
					cfgVal = this.config[cfgKey];
				}
				if (cfgVal === false || cfgVal == "disabled" || cfgVal === 0) continue;
				if(p == "autoplay" && this.config.isHtml5ShowLoadingAdOnStart){//如果设置了要播放loading广告就不要自动播放
					continue;
				}
				str += p;
				if (p == "autoplay" && cfgVal == true) {
					str += '="autoplay"'
					continue;
				};
				if (cfgVal != "") {
					str += ['=', cfgVal].join("");
				}

			}

			//ios禁用了自定义控制栏就开启原生控制栏
			if(!this.isUseControl && $.os.iphone){
				var _html5ForbiddenUIFeature = this.config.html5ForbiddenUIFeature.join('-');
				if(_html5ForbiddenUIFeature.indexOf('controlbar') > -1){
					this.isUseControl = true;
				}
			}

			if (this.isUseControl) {
				str += " controls ";
			}

			var poster = this.curVideo.getPoster();
			if ($.isString(poster) && poster.length > 0 && $.inArray("posterlayer", this.config.html5VodUIFeature) == -1) {
				str += " poster='" + poster + "'";
			}
			//不带皮肤时如果设置了pic参数 则暂时通过poster属性来显示封面
			if(!poster && this.config.pic && !this.config.isHtml5UseUI){
				str += " poster='" + this.config.pic + "'";
			}
			str += "></video>";
			return str;
		},

		write: function(modId) {
			var el = null;
			if ($.type(modId) == "object" && modId.nodeType == 1) {
				el = modId;
				this.$mod = $(modId);
				this.modId = this.$mod.attr("id") || "";
			} else {
				el = tvp.$.getByID(modId);
				this.modId = modId, this.$mod = $("#" + modId);
			}
			if (!el) return;
			var htmlBuf = this.createVideoHtml(),
				videoModId = "mod_" + this.playerid;
			el.innerHTML = '<div id="' + videoModId + '">' + htmlBuf + '</div>';
			this.videomod = $.getByID(videoModId);
			this.$videomod = $(this.videomod);
			this.$videomod.width($.formatSize(this.config.width)).height($.formatSize(this.config.height));

			this.videoTag = $.getByID(this.playerid);
			this.$video = $(this.videoTag);

			this.registerMonitor();
			this.bindEventAdapt();

			this.checkPlayerSize();
		},
		/**
		 * 处理某些指明了需要人工矫正尺寸的情况
		 * @return {[type]} [description]
		 */
		checkPlayerSize:function(){

			var me = this;
			//mp4link时没有$videomod，要设置$elements
			var $box = this.$videomod?this.$videomod:this.$elements;				

			if(!this.config.isCheckPlayerSize){
				return;
			}

			if(!$box){
				return;
			}
			_resize();

			window.addEventListener("onorientationchange" in window ? "orientationchange" : "resize", function(){
				_resize();
			}, false);
				
			function _resize(){
				//全屏时不处理
				if(me.isFullScreen){
					return;
				}
				setTimeout(function(){
					var width = me.config.width,
						height = me.config.height,
						w = parseInt($box.width(),10),
						h = parseInt($box.height(),10);
					if(height.toString().indexOf('%')>-1){
						return;
					}
					if(h>w){
						h = parseInt(w*9/16,10);
						w = width;
						me.resize(w,h);
					}							
				},100);			
			}
		},
		/**
		 * 重新设置播放器尺寸
		 * @param  {[type]} width  [description]
		 * @param  {[type]} height [description]
		 * @return {[type]}        [description]
		 */
		resize: function(width, height) {
			this.config.width = width;
			this.config.height = height;
			//mp4link时没有$videomod，要设置$elements
			var $box = this.$videomod?this.$videomod:this.$elements;
			if($box){
				$box.width($.formatSize(width)).height($.formatSize(height));
				$box.trigger('tvp:resize');
			}
		},
		/**
		 * 显示播放器播放出错
		 * @param  {Number} errcode 错误码
		 * @param  {Number} errcontent 错误码详细错误内容
		 * @param  {string} errMsg  错误描述
		 */
		showError: function(errcode, errcontent, errMsg) {

			var t = this;

			/*
				延迟不可去掉，因为页面刷新的时候由于网络传输会被各种abort导致错误
				如果不延迟会导致刷新的时候立即显示错误，体验不好，容易引起误解
			*/
			setTimeout(function() {
				
				var fn = t.getCBEvent("showError");
				if ($.isFunction(fn) && fn != t.showError) {
					fn.call(t, errcode, errcontent, errMsg);
				} else if ($.isFunction(t.config["showError"])) {
					t.config["showError"].call(t, errcode, errcontent, errMsg);
				} else {
					var str = tvp.html5skin.defaultError,
						tipsId = t.playerid + "_errtips_inner",
						errCodeTxt = "错误码:" + errcode,
						errContentTxt = errcontent || errcontent == 0 ? '_'+errcontent : "";

					if(tvp.html5lang.errMsg[errcode] && tvp.html5lang.errMsg[errcode].nocode){
						errContentTxt = ""; 
					}

					str = str.replace("$ERROR-TIPS-INNER$", tipsId)
						.replace("$ERROR-MSG$", errMsg || tvp.html5lang.getErrMsg(errcode, errcontent))
						.replace("$ERROR-DETAIL$","(" +errCodeTxt + errContentTxt+ ")");
					var $videomod = $(t.videomod),
						$tips = $(str).appendTo($videomod).show();
					//$tips.css("width", t.config.modWidth).css("height", t.config.modHeight).show();
					$videomod.html("");
					$tips.appendTo($videomod);

					try {
						//执行回调处理
						if(tvp.html5lang.errMsg[errcode] && tvp.html5lang.errMsg[errcode].callback){
							tvp.html5lang.errMsg[errcode].callback($tips,errcontent,{
								vid:t.curVideo.getVid()
							});
						}
					}catch(e){

					}
				}
			}, 250);

			//相应onerror事件
			this.callCBEvent("onerror", errcode, errcontent);

		},
		/**
		 * 是否使用了自定义的HTML5播放器的某个特性
		 * @param  {type}    fName [description]
		 * @return {Boolean}       [description]
		 */
		isUseH5UIFeature: function(fName) {
			return $.inArray(fName, this.config.html5VodUIFeature) >= 0;
		},
		/**
		 * 是否禁止了自定义的HTML5播放器的某个特性
		 * @param  {[type]}  fName [description]
		 * @return {Boolean}       [description]
		 */
		isForbiddenH5UIFeature: function(fName) {
			return $.inArray(fName, this.config.html5ForbiddenUIFeature) >= 0;
		},
		/**
		 * 调用本地的保护方法
		 * @ignor
		 * @param  {type} fnName 调用本地的保护方法
		 * @return {type}        调用本地的保护方法
		 */
		callProtectFn: function(fnName) {
			if ($.isFunction(this.protectedFn[fnName])) {
				this.protectedFn[fnName].call(this);
			}
		},
		/**
		 * 注册数据上报监听
		 */
		registerMonitor: function() {
			if ($.isFunction(this["buildmonitor"])) {
				this["buildmonitor"].call(this);
			}
		},
		/**
		 * 绑定事件处理
		 */
		bindEventAdapt: function() {
			var evts = [
				"-empty",
				"-abort",
				"-loadstart",
				"-can-play",
				"-can-play-through",
				"-loaded-data",
				"-loaded-metadata",
				"-abort",
				"-error",
				"-pause",
				"-paused",
				"-waiting",
				"-stalled",
				"-suspend",
				"-play",
				"-volume-change",
				"-playing",
				"-seeked",
				"-seeking",
				"-duration-change",
				"-progress",
				"-rate-change",
				"-timeupdate",
				"-ended"
			];
			var t = this;
			$.each(evts, function(i, k) {
				var evtName = "on" + $.camelCase(k),
					fn = t.h5EvtAdapter[evtName];
				if (DEBUG || $.isFunction(fn)) {
					t.$video.on(k.replace(/-/g, ""), function(e) {
						// if (DEBUG) {
						// 	tvp.log(e.type);
						// 	if (e.type == "durationchange") {
						// 		tvp.log("duration = " + e.target.duration);
						// 	}
						// }
						var fn = t.h5EvtAdapter[evtName];
						$.isFunction(fn) && (fn.call(t, this, e));
						// $.isFunction(t[evtName]) && (t[evtName](e));
					});
				}
			});
		}
	});

	tvp.BaseHtml5.maxId = 0;

})(tvp, tvp.$);