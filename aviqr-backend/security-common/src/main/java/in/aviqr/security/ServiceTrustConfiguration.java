package in.aviqr.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Set;

/** Only the gateway and authenticated service clients may reach business controllers. */
@Configuration
@org.springframework.context.annotation.Import(DatabasePrivilegeConfiguration.class)
public class ServiceTrustConfiguration {
    private static final Set<String> SERVICES = Set.of("auth-service", "shop-mall-service", "menu-ocr-service",
        "order-qr-service", "payment-service", "hotel-service", "support-service",
        "notification-report-review-service", "pms-service", "payment-gateway-service");

    public static boolean matches(String expected, String supplied) {
        return expected != null && !expected.isBlank() && supplied != null &&
            MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8));
    }

    @Bean public in.aviqr.identity.ServiceIdentity serviceIdentity(Environment env){return identity(env);}
    private static in.aviqr.identity.ServiceIdentity identity(Environment env){return new in.aviqr.identity.ServiceIdentity(env.getProperty("spring.application.name",""),env.getProperty("SERVICE_SIGNING_KEY_ID","v1"),env.getProperty("SERVICE_SIGNING_PRIVATE_KEY",""),env.getProperty("SERVICE_SIGNING_PUBLIC_KEYS","{}"),env.getProperty("SERVICE_ALLOWED_CALLERS","api-gateway,auth-service,shop-mall-service,menu-ocr-service,order-qr-service,payment-service,hotel-service,support-service,notification-report-review-service,pms-service,payment-gateway-service"),env.getProperty("app.service-signed-auth-required",Boolean.class,env.getProperty("SERVICE_SIGNED_AUTH_REQUIRED",Boolean.class,false)));}
    @Bean
    public FilterRegistrationBean<OncePerRequestFilter> serviceTrustFilter(Environment env,in.aviqr.identity.ServiceIdentity identity) {
        String secret = env.getProperty("internal.sync.secret", env.getProperty("INTERNAL_SYNC_SECRET", ""));
        if (secret.length() < 32 || secret.startsWith("replace_")) throw new IllegalStateException("INTERNAL_SYNC_SECRET must contain at least 32 characters");
        var filter = new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
                    throws ServletException, IOException {
                String path = req.getRequestURI();
                if (path.equals("/actuator/health") || path.startsWith("/actuator/health/")) {
                    chain.doFilter(req, res); return;
                }
                boolean gateway = matches(secret, req.getHeader("X-Gateway-Secret"));
                boolean internal = matches(secret, req.getHeader("X-Internal-Secret"));
                // Internal APIs must never be accessible through a public gateway route.
                if ((!gateway && !internal) || (path.contains("/internal/") && !internal)) {
                    res.sendError(401, "Authenticated service connection required"); return;
                }
                if(identity.required() || req.getHeader("X-Service-Assertion")!=null){
                    byte[] body=req.getInputStream().readNBytes(26*1024*1024+1);
                    if(body.length>26*1024*1024){res.sendError(413);return;}
                    var headers=new java.util.HashMap<String,String>();for(String name:in.aviqr.identity.ServiceIdentity.boundHeaders())if(req.getHeader(name)!=null)headers.put(name,req.getHeader(name));
                    String target=path+(req.getQueryString()==null?"":"?"+req.getQueryString());
                    if(!identity.verify(req.getHeader("X-Service-Assertion"),req.getMethod(),target,body,headers)){res.sendError(401,"Invalid service assertion");return;}
                    var wrapped=new jakarta.servlet.http.HttpServletRequestWrapper(req){
                        private java.util.List<jakarta.servlet.http.Part> parts;
                        @Override public java.util.Collection<jakarta.servlet.http.Part> getParts() throws IOException,jakarta.servlet.ServletException {
                            if(parts==null){
                                var factory=org.apache.commons.fileupload2.core.DiskFileItemFactory.builder().get();
                                var upload=new org.apache.commons.fileupload2.jakarta.servlet6.JakartaServletDiskFileUpload(factory);
                                upload.setMaxSize(26L*1024*1024);upload.setMaxFileSize(25L*1024*1024);upload.setMaxFileCount(30);upload.setMaxPartHeaderSize(8192);
                                parts=new java.util.ArrayList<>();
                                for(var item:upload.parseRequest(this))parts.add(new jakarta.servlet.http.Part(){
                                    public java.io.InputStream getInputStream() throws IOException{return item.getInputStream();}
                                    public String getContentType(){return item.getContentType();}public String getName(){return item.getFieldName();}
                                    public String getSubmittedFileName(){return item.isFormField()?null:item.getName();}public long getSize(){return item.getSize();}
                                    public void write(String name) throws IOException{item.write(java.nio.file.Path.of(name));}public void delete() throws IOException{item.delete();}
                                    public String getHeader(String name){return item.getHeaders().getHeader(name);}
                                    public java.util.Collection<String> getHeaders(String name){var list=new java.util.ArrayList<String>();item.getHeaders().getHeaders(name).forEachRemaining(list::add);return list;}
                                    public java.util.Collection<String> getHeaderNames(){var list=new java.util.ArrayList<String>();item.getHeaders().getHeaderNames().forEachRemaining(list::add);return list;}
                                });
                            }return parts;
                        }
                        @Override public java.util.Map<String,String[]> getParameterMap(){
                            var values=new java.util.LinkedHashMap<String,java.util.List<String>>();
                            super.getParameterMap().forEach((key,value)->values.put(key,new java.util.ArrayList<>(java.util.Arrays.asList(value))));
                            if(getContentType()!=null && getContentType().toLowerCase(java.util.Locale.ROOT).startsWith("multipart/form-data"))try{
                                for(var part:getParts())if(part.getSubmittedFileName()==null && part.getSize()<=8192 && !values.containsKey(part.getName()))
                                    values.put(part.getName(),new java.util.ArrayList<>(java.util.List.of(new String(part.getInputStream().readAllBytes(),StandardCharsets.UTF_8))));
                            }catch(Exception e){throw new IllegalArgumentException("Invalid multipart request",e);}
                            var result=new java.util.LinkedHashMap<String,String[]>();values.forEach((key,value)->result.put(key,value.toArray(String[]::new)));return java.util.Collections.unmodifiableMap(result);
                        }
                        @Override public String[] getParameterValues(String name){return getParameterMap().get(name);}
                        @Override public String getParameter(String name){var values=getParameterValues(name);return values==null || values.length==0?null:values[0];}
                        @Override public java.util.Enumeration<String> getParameterNames(){return java.util.Collections.enumeration(getParameterMap().keySet());}
                        @Override public jakarta.servlet.http.Part getPart(String name) throws IOException,jakarta.servlet.ServletException{return getParts().stream().filter(p->p.getName().equals(name)).findFirst().orElse(null);}

                        @Override public jakarta.servlet.ServletInputStream getInputStream(){var input=new java.io.ByteArrayInputStream(body);return new jakarta.servlet.ServletInputStream(){public int read(){return input.read();}public boolean isFinished(){return input.available()==0;}public boolean isReady(){return true;}public void setReadListener(jakarta.servlet.ReadListener listener){throw new UnsupportedOperationException();}};}
                        @Override public java.io.BufferedReader getReader(){return new java.io.BufferedReader(new java.io.InputStreamReader(getInputStream(),StandardCharsets.UTF_8));}
                    };
                    req.setAttribute("aviqr.authenticatedService", Boolean.TRUE);
                    chain.doFilter(wrapped,res);return;
                }
                req.setAttribute("aviqr.authenticatedService", Boolean.TRUE);
                chain.doFilter(req, res);
            }
        };
        var registration = new FilterRegistrationBean<OncePerRequestFilter>(filter);
        registration.setOrder(-200);
        return registration;
    }

    @Bean
    public static BeanPostProcessor internalServiceCredentials(Environment env) {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String name) {
                if (bean instanceof RestTemplate client && !name.equals("externalRestTemplate")) {
                    String secret = env.getProperty("internal.sync.secret", env.getProperty("INTERNAL_SYNC_SECRET", ""));
                    var signer=identity(env);
                    // Only service-discovery hosts receive credentials; never external providers.
                    client.getInterceptors().add(0, (request, body, execution) -> {
                        if (SERVICES.contains(request.getURI().getHost())) {
                            request.getHeaders().set("X-Internal-Secret", secret);
                            var headers=new java.util.HashMap<String,String>();for(String header:in.aviqr.identity.ServiceIdentity.boundHeaders())if(request.getHeaders().getFirst(header)!=null)headers.put(header,request.getHeaders().getFirst(header));
                            var uri=request.getURI();String target=uri.getRawPath()+(uri.getRawQuery()==null?"":"?"+uri.getRawQuery());
                            String assertion=signer.sign(uri.getHost(),request.getMethod().name(),target,body,headers);
                            if(assertion!=null)request.getHeaders().set("X-Service-Assertion",assertion);
                        }
                        return execution.execute(request, body);
                    });
                }
                return bean;
            }
        };
    }
}
