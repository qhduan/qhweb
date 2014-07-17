

function Alert (content, callback) {
  $("#AlertModalBody").html(content);
  $("#AlertModal").on("hidden.bs.modal", function () {
    $("#AlertModal").off("hidden.bs.modal");
    if (callback) callback();
  });
  $("#AlertModal").modal();
}

var ConfirmState = null;

function Confirm (content, callback) {
  ConfirmState = null;
  $("#ConfirmModalBody").html(content);
  $("#ConfirmModal").on("hidden.bs.modal", function () {
    $("#ConfirmModal").off("hidden.bs.modal");
    if (callback) {
      callback(ConfirmState);
    }
  });
  $("#ConfirmModal").modal();
}

$(document).ready(function () {
  $("body").append("" +
  "<div class='modal fade' id='AlertModal' tabindex='-1' role='dialog' aria-labelledby='AlertModalLabel' aria-hidden='true' data-backdrop='false' data-keyboard='false'>" +
    "<div class='modal-dialog'>" +
      "<div class='modal-content'>" +
        "<div class='modal-header'>" +
          "<h4 id='AlertModalLabel' class='modal-title'>Alert</h4>" +
        "</div>" +
        "<div id='AlertModalBody' class='modal-body'>" +
        "</div>" +
        "<div class='modal-footer'>" +
          "<button type='button' class='btn btn-default' data-dismiss='modal'><span class='glyphicon glyphicon-ok'></span> Ok</button>" +
        "</div>" +
      "</div><!-- /.modal-content -->" +
    "</div><!-- /.modal-dialog -->" +
  "</div><!-- /.modal -->");
  
  
  $("body").append("" +
  "<div class='modal fade' id='ConfirmModal' tabindex='-1' role='dialog' aria-labelledby='ConfirmModalLabel' aria-hidden='true' data-backdrop='false' data-keyboard='false'>" +
    "<div class='modal-dialog'>" +
      "<div class='modal-content'>" +
        "<div class='modal-header'>" +
          "<h4 id='ConfirmModalLabel' class='modal-title'>Confirm</h4>" +
        "</div>" +
        "<div id='ConfirmModalBody' class='modal-body'>" +
        "</div>" +
        "<div class='modal-footer'>" +
          "<button type='button' id='ConfirmModalYes' class='btn btn-default' data-dismiss='modal'><span class='glyphicon glyphicon-ok'></span> Yes</button>" +
          "<button type='button' id='ConfirmModalNo' class='btn btn-default' data-dismiss='modal'><span class='glyphicon glyphicon-remove'></span> No</button>" +
        "</div>" +
      "</div><!-- /.modal-content -->" +
    "</div><!-- /.modal-dialog -->" +
  "</div><!-- /.modal -->");
  
  $("#ConfirmModalYes").click(function () {
    ConfirmState = true;
  });
  
  $("#ConfirmModalNo").click(function () {
    ConfirmState = false;
  });
});


function Encode (d) {
  return btoa(unescape(encodeURIComponent(d)));
}

function Decode (d) {
  return decodeURIComponent(escape(atob(d)));
}
