
$(function() {
  
  var client = ZAFClient.init();
  client.invoke('resize', { width: '100%', height: '200px' });

  getTicket(client)

  client.on("ticket.updated", function(e) {
    console.log("Update Ticket Event")
    getTicket(client)
  });
 
});

function formatDate(date) {
  var cdate = new Date(date);
  var options = {
    year: "numeric",
    month: "short",
    day: "numeric"
  };
  date = cdate.toLocaleDateString("en-us", options);
  return date;
}

function getTicket(client) {

  client.get('ticket.customField:custom_field_5186722333455').then(
   
    function(data) {

      let ticketDataString = data['ticket.customField:custom_field_5186722333455']
      let ticketData = JSON.parse(ticketDataString)
      showTicketInfo(ticketData)
    }
  ); 

}

function showTicketInfo(data) {

  let order_mid = data.orderInfo.orderMid
  console.log('order_mid', order_mid)

  var requester_data = {
    // orderContact
    'contact_first_name': data.orderContact.contactFirstname,
    'contact_last_name': data.orderContact.contactLastname,
    'contact_email': data.orderContact.contactEmail,
    'tel_country_cd': data.orderContact.telCountryCd,
    'contact_tel': data.orderContact.contactTel,
    'contact_country_cd': data.orderContact.contactCountryCd,

    // orderInfo
    'member_uuid': data.orderInfo.memberUuid,
    'order_mid': data.orderInfo.orderMid,
    'order_status_txt': data.orderInfo.orderStatusTxt,
    'order_lang_code': data.orderInfo.orderLangCode,
    'crt_dt': data.orderInfo.crtDt,
    'curr_price_total': data.orderInfo.currPriceTotal,
    
    // productInfo
    'product_oid': data.productInfo.productOid,
    'order_lang_code': data.productInfo.orderLangCode,
    'product_name_master': data.productInfo.productNameMaster,
    'package_name_master': data.productInfo.packageNameMaster,
    'product_name_user_lang': data.productInfo.productNameUserLang,
    'package_name_user_lang': data.productInfo.packageNameUserLang,
    'beg_lst_go_dt': data.productInfo.begLstGoDt,
    'end_lst_back_dt': data.productInfo.endLstBackDt,
    'guide_lang': data.productInfo.guideLang
  };

  var source = $("#requester-template").html();
  var template = Handlebars.compile(source);
  var html = template(requester_data);
  $("#content").html(html);
}