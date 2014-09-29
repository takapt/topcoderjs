function scrapeMMStandings(url) {
    $.ajax({
        url: url,
        type: "GET",
        dataType: "html",
        success: function (html) {
            html = html.replace(/<img[\s\S]*?>/g, "");
            var table_re = /<table[\s\S]*statTableHolder[\s\S]*?table>/m;
            var table_html = table_re.exec(html)[0];
            var table = $.parseHTML(table_html);
            ww = $(table).find(".colorTextRed");
            $("body").text(table_html);
        }
    });
}
