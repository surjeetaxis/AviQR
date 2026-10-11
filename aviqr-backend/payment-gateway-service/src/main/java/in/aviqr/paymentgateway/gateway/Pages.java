package in.aviqr.paymentgateway.gateway;

import org.springframework.web.util.HtmlUtils;

import java.util.Map;

/** The small pages the guest sees while being handed to a gateway. */
public final class Pages {
    private Pages() {}

    public static String esc(String s) { return s == null ? "" : HtmlUtils.htmlEscape(s); }

    /** Escapes a value for a JavaScript string literal inside a script tag. */
    public static String js(String s) {
        if (s == null) return "";
        StringBuilder b = new StringBuilder();
        for (char c : s.toCharArray()) {
            if (c == '\\' || c == '\'' || c == '"') b.append('\\').append(c);
            else if (c == '<' || c == '>' || c == '&' || c < 0x20) b.append(String.format("\\u%04x", (int) c));
            else b.append(c);
        }
        return b.toString();
    }

    public static String shell(String title, String head, String body) {
        return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            + "<title>" + esc(title) + "</title><meta name=\"robots\" content=\"noindex\">"
            + "<style>body{font-family:system-ui,-apple-system,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f5f1;color:#1d2420}"
            + ".card{max-width:420px;padding:32px;text-align:center}.spin{width:36px;height:36px;margin:0 auto 18px;border:3px solid #d8d6cc;border-top-color:#1f7257;border-radius:50%;animation:s 1s linear infinite}"
            + "@keyframes s{to{transform:rotate(360deg)}}button{font:inherit;padding:10px 18px;border-radius:10px;border:0;background:#1f7257;color:#fff;cursor:pointer}</style>"
            + head + "</head><body><div class=\"card\">" + body + "</div></body></html>";
    }

    public static String autoPost(String url, Map<String, String> fields) {
        StringBuilder inputs = new StringBuilder();
        fields.forEach((k, v) -> inputs.append("<input type=\"hidden\" name=\"").append(esc(k)).append("\" value=\"").append(esc(v)).append("\">"));
        return shell("Redirecting to payment…", "",
            "<div class=\"spin\"></div><p>Taking you to the secure payment page…</p>"
            + "<form id=\"pay\" method=\"post\" action=\"" + esc(url) + "\" accept-charset=\"utf-8\">" + inputs
            + "<noscript><button type=\"submit\">Continue to payment</button></noscript></form>"
            + "<script>document.getElementById('pay').submit()</script>");
    }

    public static String message(String title, String text) {
        return shell(title, "", "<h2>" + esc(title) + "</h2><p>" + esc(text) + "</p>");
    }
}
