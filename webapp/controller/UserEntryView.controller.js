sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/odata/v2/ODataModel",
	"sap/ui/model/Filter",
	'sap/m/Dialog',
	'sap/m/Button',
	'sap/m/Text',
	"sap/m/MessageToast"
], function(Controller, JSONModel, ODataModel, Filter, Dialog, Button, Text, MessageToast) {
	"use strict";
	var _view,
		emptyUser = {
			username: "",
			name: "",
			email: "",
			cab: {
				address: "",
				distance: 0,
				canAvail: false,
				availed: false
			}
		};
	var oDataModel;
	var DB = {
		queryData: function(inputUsername, callback) {
			oDataModel.read("/scholarcab('" + inputUsername + "')", {
				success: function(data) {
					var userData = {
						username: data.SCHOLAR_ID,
						name: data.SCHOLAR_NAME,
						email: data.EMAIL_ID,
						cab: {
							address: data.G_ADDRESS,
							distance: data.DISTANCE,
							canAvail: (data.CAN_AVAIL === 1),
							availed: (data.AVAILED === 1)
						}
					};
					callback(userData);
				},
				error: function() {
					var userData = {};
					callback(userData);
				}
			});
		},
		updateData: function(userData, callback) {
			var oData = {
				SCHOLAR_ID: userData.username,
				SCHOLAR_NAME: userData.name,
				EMAIL_ID: userData.email,
				G_ADDRESS: userData.cab.address,
				DISTANCE: userData.cab.distance,
				CAN_AVAIL: userData.cab.availed ? 1 : 0,
				AVAILED: userData.cab.availed ? 1 : 0
			};
			oDataModel.update("/scholarcab('" + userData.username + "')", oData, {
				success: function() {
					callback(true);
				},
				error: function() {
					callback(false);
				}
			});
		}
	};

	return Controller.extend("com.sap.scholar2016.cabmini.controller.UserEntryView", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.sap.scholar2016.cabmini.view.UserEntryView
		 */
		onInit: function() {
			oDataModel = new ODataModel({
				serviceUrl: "/scholarcab_odata"
			});
			var oModel = new JSONModel();
			var initData = {
				currentUser: emptyUser,
				userList: [{
					username: "I327891",
					name: "Merbin J Anselm",
					email: "merbin.j.anselm@sap.com",
					cab: {
						address: "",
						distance: 0,
						canAvail: false,
						availed: false
					}
				}]
			};
			oModel.setData(initData);
			this.getView().setModel(oModel);
			_view = this.getView();

			var binding = new sap.ui.model.Binding(oModel, "/currentUser/cab/canAvail", oModel.getContext("/"));
			binding.attachChange(function() {
				_view.byId("sw_avail").setEnabled(JSON.parse(oModel.getJSON()).currentUser.cab.canAvail);
				if (!JSON.parse(oModel.getJSON()).currentUser.cab.canAvail) {
					_view.byId("sw_avail").setState(false);
				}
			});

			var oData = {
					cab: {
						address: "",
						canAvail: false
					}
				},
				oVModel = new JSONModel();
			oVModel.setData(oData);
			sap.ui.getCore().setModel(oVModel, "mapData");
			var oTModel = sap.ui.getCore().getModel("mapData");
			var bind = new sap.ui.model.Binding(oTModel, "/cab", oTModel.getContext("/"));
			bind.attachChange(function() {
				var dataObj = JSON.parse(sap.ui.getCore().getModel("mapData").getJSON());
				oModel.setProperty('/currentUser/cab/address', dataObj.cab.address);
				oModel.setProperty('/currentUser/cab/canAvail', dataObj.cab.canAvail);
				_view.setModel(oModel);
				_view.byId('btnSave').setEnabled(dataObj.cab.address !== "");
			});

			_view.byId('btnSave').setEnabled(false);
			_view.byId('btnAddress').setEnabled(false);
		},
		onUsernameValidate: function(oEvent) {
			var usernameInput = _view.byId("usernameInput"),
				oModel = _view.getModel(),
				txt = oEvent.getParameters().query,
				valid = true;
			DB.queryData(txt, dbCallback);

			function dbCallback(userData) {
				if (!userData.username) {
					userData = emptyUser;
					valid = false;
					MessageToast.show("No Scholar user found!");
				}
				oModel.setProperty('/currentUser', userData);
				_view.setModel(oModel);
				_view.byId('btnSave').setEnabled(JSON.parse(_view.getModel().getJSON()).currentUser.cab.address !== "");
				_view.byId('btnAddress').setEnabled(valid);
			}
		},
		onSaveChanges: function(oEvent) {
			var oModel = _view.getModel();
			var dataObj = JSON.parse(oModel.getJSON());
			var dialog = new Dialog({
				title: 'Scholar Cab Booking',
				type: 'Message',
				state: dataObj.currentUser.cab.canAvail ? (dataObj.currentUser.cab.availed ? 'Success' : 'Warning') : 'Error',
				content: new Text({
					text: dataObj.currentUser.cab.canAvail ? (dataObj.currentUser.cab.availed ? 'Cab request accepted!' :
						'Cab request cancelled!') : 'You are within 8Km from SAP \n Request for cab is denied!'
				}),
				beginButton: new Button({
					text: 'OK',
					press: function() {
						dialog.close();
						oModel.setProperty('/currentUser', emptyUser);
						_view.setModel(oModel);
						_view.byId('btnSave').setEnabled(false);
						_view.byId('btnAddress').setEnabled(false);
						_view.byId('sw_avail').setEnabled(false);
					}
				}),
				afterClose: function() {
					dialog.destroy();
				}
			});
			_view.setBusy(true);
			DB.updateData(dataObj.currentUser, dbCallback);

			function dbCallback(success) {
				_view.setBusy(false);
				if (success) {
					MessageToast.show("User details saved");
					dialog.open();
				} else {
					MessageToast.show("Error saving user details!");
				}
			}
		},
		onSelectAddress: function() {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("mapView");
		}
	});

});