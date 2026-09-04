(function($) {
    "use strict";
    /* Auxin Ajax Filter */
    $(".auxin-news-element li[data-filter]").on( 'click', function(e) {
        e.preventDefault();
        var $this = $(this),
            $parent = $this
                .parents(".aux-ajax-view")
                .addClass("aux-ajax-progress"),
            data = {
                term: $this.data("filter"),
                action: "news_filter_get_content",
                args: eval($parent.data("element-id") + "AjaxConfig"),
                n: $(".aux-ajax-filters").data("n")
            };

        $.post(auxnew.ajax_url, data, function(res) {
            if (res) {
                $parent
                    .removeClass("aux-ajax-progress")
                    .find(".aux-news-element-main")
                    .html(res);
            } else if (res === '') {
                $parent.removeClass("aux-ajax-progress");
            } else {
                console.log(res);
            }
        });
    });
})(jQuery);
