/*!
 * 表单验证
 * @param {jQuery Object or id string} formNodeOrId 传入要验证表单的jQuery对象或者id值 
 * @param {object} options 一些配置
 * @return {object} 返回实例对象 用于链式操作
 * version 1.1
 * author David Wang
 */
(function($,w){ 
	function Validate(formNodeOrId,options){
		var that = this;
		this.submitStatue = false; //是否按下提交按钮
		this.form = this.formByNodeOrId(formNodeOrId);
		this.option = $.extend({
			needCheck : ["input","textarea"], // 表单中要验证的元素
			event : { //要注册的事件
				blur : true,
				focus : true
			},
			openSubmitValidate : true, //开启表单提交验证
			blur : null, //失去焦点回调
			focus :function (){}, //获得焦点回调
			callback : null //提交回调
		},options);
		this.error = []; //错误容器
		this.defaultConfig = {
			need : false,	 //是否必须
			icon : { 		// 提示信息显示的icon值
				success : "<i class='icon icon-public icon-check'></i>",
				error : "<i class='icon icon-public icon-cross'></i>",
				warning : "<i class='icon icon-public icon-warning'></i>"
			},
			emptyMsg : "必填，不能为空", // 为空错误提示
			requireMsg : "", // 默认提示
			successMsg : "", // 合法提示
			typeMsg : "类型错误", // 类型错误提示
			relatedMsg : "", // 相关项提示
			range : null,
			type : "string",
			hintClass : "hint", 
			hintId : "", 
			related : null // 关联模式
		};
		this.validateFields(); //开始验证
		this.form.submit(function (event){
			//如果关闭验证 直接提交
			if(!that.option['openSubmitValidate']) return true;
			that.submitStatue = true;
			that.validateFields();
			that.errorShow(null);
			return that.option['callback'] ? that.option['callback'](that.form,that.error) : (that.error.length == 0);
		});
		return this;
	}
	
	/* 
	 * 选项设置
	 * @param {string} option
	 * @param {mix} value
	 */
	Validate.prototype.setOption = function(option,value){
		if(option == "openSubmitValidate"){
			// 设置验证开启关闭状态
			if(typeof value == "boolean"){
				this.option['openSubmitValidate'] = value;
			}
		}else if(option == "needCheck"){
			if(!$.isArray(value)){
				this.option['needCheck'] = value;
				this.validateFields(); //重新验证
			}
		}
		return this;
	}
	
	/* 
	 * 错误显示
	 * @param {object} field
	 * @param {object or string} config
	 */
	Validate.prototype.errorShow = function(field,config){
		var that = this,
			hint = null,
			parent = field == null ? null : field.parent(),
			msg = "", // 提示信息
			exist;
		if(typeof config != "undefined"){
			// 获取显示错误信息所在的元素
			// 如果没有找到hintClass，则尝试找hintId
			config['hintClass'] && (hint = parent.find("."+ config['hintClass'])) && hint.length > 0 ? "" : config['hintId']&& (hint = $("#"+ config['hintId']));
		}
		// 获取错误信息位置
		exist = field != null ? this.errorHandle.exist(this,{"field":field}) : false;
		if(config == "clear"){
			if(field == null){
				// 清除全部信息
				$.each(this.error,$.proxy(function(i,n){
					this.errorShow(n['field'],"clear",true);
				},this));
			}
		}else{
			if((field != null) && exist){
				//如果存在错误和相应表单元素
				msg = config['icon']['error'] + this.error[exist['index']]['msg'];
				if(!parent.hasClass("error")) parent.addClass("error");
			}else if(field != null && !exist){
				// 如果相应表单无错误
				msg = config['icon']['success'] + config['successMsg'];
				parent.removeClass("error");
			}else if(field == null){
				// 显示全部信息
				$.each(this.error,$.proxy(function(i,n){
					this.errorShow(n['field'],n['config'],true);
				},this));
			}
		}
		(hint != null) && hint.html(msg);
	}
	
	/* 
	 * 获取元素节点
	 * @param {jQuery Object or id string} formNodeOrId 传入要验证表单的jQuery对象或者id值 
	 * return jQuery对象
	 */ 
	Validate.prototype.formByNodeOrId = function (formNodeOrId){
		if(formNodeOrId instanceof jQuery) return formNodeOrId.addClass('js-ui-validate');
		return $(formNodeOrId).addClass("js-ui-validate");
	}

	/* 
	 * 对单个表单元素进行验证
	 * @param {object} config 配置信息
	 * @param {object} field  表单元素
	 * return {object} 对象
	 */
	Validate.prototype.validateField = function (field,config){ 
		if(config['need'] && (config['need'] != "false")){ //如果是必填
			if(!this.checkType['require'](field)){
				//检查是否为空
				this.errorHandle.add(this,field,config['emptyMsg'],config);
				return false; 
			}
		}
		var value = $.trim(field.val()); 
		if(config["related"] && !this.relatedHandle(config["related"],value)){
			//如果是有相关元素
			this.errorHandle.add(this,field,config['relatedMsg'],config);
			return false; 
		}
		if(value){
			//如果存在值 不管是否是必须都检查它的合法性
			if((config['type'] != "string") && !this.checkType[config['type']](value,field,config,this)){
				this.errorHandle.add(this,field,config['requireMsg'],config);
				return false; 
			}
			if(config['range'] && $.isArray(config['range'])){
				var length = typeof value === "string" ? value.length  : (!isNaN(Number(value))? parseInt(value) : null);
				if((length != null) && !(length >= config['range'][0] && length <= config['range'][1])){ 
					this.errorHandle.add(this,field,config['requireMsg'],config);
					return false; 
				}
			}else if(config['range'] && !isNaN(config['range'])){
				if(value.length !== parseInt(config['range'])){
					this.errorHandle.add(this,field,config['requireMsg'],config);
					return false; 
				}
			}
		}
		this.errorHandle.remove(this,field);
		return true;
	}
	
	/* 
	 * 对表单内元素遍历验证
	 * @return {object}
	 */
	Validate.prototype.validateFields = function (){
		var that = this,
			copyConfig,
			returnValue = null;
		$.each(that.option['needCheck'],function(n,item){
			var items = that.form.find(item);
			$.each(items,function(i,m){
				//遍历所有所需验证的元素
				var field = $(this),
					config = field.data("config");
				config = that.parseJson(config);
				if(config != null){
					copyConfig = $.extend({},that.defaultConfig), //拷贝默认设置 防止污染系统默认设置
					config = $.extend(copyConfig,config);
					if(that.option['event']['blur']) field.on("blur",function (event){that.validateHandle['blur'](that,config,field)});
					if(that.option['event']['focus']) field.on("focus",function (event){that.validateHandle['focus'](that,config,field)});
					if(that.submitStatue){
						if(that.validateField(field,config)){
							return true;
						}
					}
				}
			});
		});
	}
	
	/*
	 * 将所传参数转换成json
	 * @param {mix} o 要转化的参数
	 * @return {object} 
	 */
	Validate.prototype.parseJson = function(o){
		if($.isPlainObject(o)) return o; // 已经是对象 则直接返回
		if(typeof o == "string") return $.parseJSON(o);
		return null;
	}

	/* 
	 * 清除提示信息
	 * @return {Object} 当前对象
	 */
	Validate.prototype.tipClear = function (){
		this.errorShow(null,"clear");
		this.error = [];
		return this;
	}

	/* 
	 * 错误处理
	 * @param {object} field 
	 * @param {}
	 */
	Validate.prototype.errorHandle = {
		exist : function (that,e){
			//检查错误是否已经存在在数组
			for(var i = 0,len = that.error.length;i < len; i++){
				for(var p in that.error[i]['field']){
					if(!e["field"][p] || (e["field"][p] != that.error[i]['field'][p])){
						break;
					}
					return {"index" : i}
				}
			}
			return false;
		},
		add : function (that,field,msg,config){
			//添加错误
			var e = {
				"field" : field,
				"msg" : msg,
				"config" : config
			},rs = this.exist(that,e);
			if(!rs || (that.error.length == 0)){
				//如果错误不存在或者为第一个错误
				that.error.push(e);
			}else{
				that.error[rs["index"]]['msg'] = msg;
			}
			field.data("error",true); //添加错误标识
		},
		remove : function(that,field){
			//删除错误
			var e = {
				"field" : field
			},rs = this.exist(that,e);
			if(rs){
				that.error.splice(rs["index"],1);
			}
			field.data("error",false);
		}
	}

	/* 
	 * 处理关联元素
	 * @param {string} mode 关联字段
	 * @param {string} value
	 * @return {boolean}
	 */
	Validate.prototype.relatedHandle = function(mode,value){
		var match = mode.split("|"), //分隔关联字段
			relatedEle = this.form.find("input[name="+match[0]+"]"),
			relatedValue = $.trim(relatedEle.val());
		if(relatedEle && relatedEle.length != 0){
			switch(parseInt(match[1])){
				case 0:   //与之关联的元素值要相同
					if(relatedValue == value) return true;
					return false;
					break;
				case 1:  //若一个有值则另一个必有值
					if((this.checkType['require'](relatedEle) && value) || (!this.checkType['require'](relatedEle) && !value)) return true;
					return false;
					break;
				case 2:  //与之关联的二者存其一
					if(this.checkType['require'](relatedEle) || value) return true;
					return false;
					break;
				default:
					return false;
			}
		}
	}

	/* 事件处理
	 * @param {object} config 配置信息
	 * @param {object} field  表单元素
	 */
	 
	Validate.prototype.validateHandle = {
		blur : function (that,config,field){
			that.validateField(field,config);
			if(that.option["blur"]){
				that.option['blur'].call(null,config,field);
			}
			that.errorShow(field,config);
		},
		focus : function(that,config,field){
			that.option['focus'].call(null,config,field);
		}
	}
	/* 
	 * 值验证
	 * @param {string} value  元素值
	 * @param {object} field  表单元素
	 * return {boolean}
	 */
	Validate.prototype.checkType = {
		require : function(field){
			var value  = $.trim(field.val()),
				tp = field.attr("type");
			if((tp === "checkbox") || (tp === "radio")) return (field[0].checked === true);
			return (value !== null && value !== '');
		},
		isEmail : function (value){
			return JS.reg['emailRegex'].test(value);
		},
		isIp : function (value){
			return JS.reg['ipRegex'].test(value);
		},
		isUrl : function (value){
			return JS.reg['urlRegex'].test(value);
		},
		isInterger : function (value){
			return JS.reg['numericRegex'].test(value);
		},
		isNumber : function (value){
			return JS.reg['decimalRegex'].test(value);
		},
		isUsername : function (value){
			return JS.reg['usernameRegex'].test(value);
		},
		isDate : function(value,field,config,instance){
			//检查时间格式
			
		},
		isRemote : function (value,field,config,that){}
	}

	$.fn.validate = function (options){
		return new Validate(this,options);
	};
}(jQuery,window));
