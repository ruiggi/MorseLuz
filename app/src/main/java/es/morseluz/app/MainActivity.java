package es.morseluz.app;

import android.Manifest;
import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.os.Environment;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CameraCharacteristics;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.view.WindowManager;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Web UI + secure local origin + Android-native torch + microphone/camera permissions. */
public class MainActivity extends Activity {
    private static final int MEDIA_PERMISSION=300, FILE_CHOOSE=301, FILE_SAVE=302;
    private static final String ORIGIN="https://morse.local";
    private WebView web;
    private PermissionRequest pendingPermission;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] pendingBytes;
    private String pendingMime;
    private CameraManager cameraManager;
    private String torchId;
    private boolean torchOn=false;
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().setStatusBarColor(0xFF0A1321);
        getWindow().setNavigationBarColor(0xFF0A1321);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        cameraManager=(CameraManager)getSystemService(Context.CAMERA_SERVICE);
        identifyFlash();
        web=new WebView(this);
        setContentView(web);
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMediaPlaybackRequiresUserGesture(false);
        if(Build.VERSION.SDK_INT>=26)settings.setSafeBrowsingEnabled(true);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.addJavascriptInterface(new NativeBridge(),"AndroidBridge");
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();if(!"morse.local".equals(uri.getHost())||!"https".equals(uri.getScheme()))return null;
                String path=uri.getPath();if(path==null||path.equals("/"))path="/index.html";
                path=path.replaceFirst("^/","");
                if(path.contains("..")||path.contains("\\")||path.contains("%"))return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,new java.io.ByteArrayInputStream(new byte[0]));
                try { InputStream stream=getAssets().open(path);String mime=path.endsWith(".html")?"text/html":path.endsWith(".js")?"text/javascript":path.endsWith(".css")?"text/css":path.endsWith(".webmanifest")?"application/manifest+json":path.endsWith(".svg")?"image/svg+xml":path.endsWith(".png")?"image/png":"application/octet-stream";return new WebResourceResponse(mime,"UTF-8",stream);
                }catch(Exception e){return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,new java.io.ByteArrayInputStream(new byte[0]));}
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !"morse.local".equals(request.getUrl().getHost());}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onPermissionRequest(PermissionRequest request){runOnUiThread(()->{
                if(!request.getOrigin().toString().startsWith(ORIGIN)){request.deny();return;}
                String[] resources=request.getResources();boolean needCamera=false,needMic=false;for(String res:resources){if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res))needCamera=true;else if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res))needMic=true;else{request.deny();return;}}
                if((!needCamera||checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)&&(!needMic||checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED)){request.grant(resources);}else{
                    pendingPermission=request;
                    if(needCamera&&needMic)requestPermissions(new String[]{Manifest.permission.CAMERA,Manifest.permission.RECORD_AUDIO},MEDIA_PERMISSION);
                    else requestPermissions(new String[]{needCamera?Manifest.permission.CAMERA:Manifest.permission.RECORD_AUDIO},MEDIA_PERMISSION);
                }
            });}
            @Override public boolean onShowFileChooser(WebView w,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;
                try{Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);pick.setType("audio/*");pick.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(pick,FILE_CHOOSE);return true;}
                catch(Exception e){fileCallback=null;return false;}
            }
        });
        web.loadUrl(ORIGIN+"/index.html");
    }
    private void identifyFlash(){try{for(String id:cameraManager.getCameraIdList()){CameraCharacteristics cc=cameraManager.getCameraCharacteristics(id);Boolean available=cc.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);if(Boolean.TRUE.equals(available)){torchId=id;break;}}}catch(Exception ignored){}}
    public final class NativeBridge{
        @JavascriptInterface public boolean hasCameraPermission(){return checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED;}
        @JavascriptInterface public void requestCameraPermission(){runOnUiThread(()->requestPermissions(new String[]{Manifest.permission.CAMERA},MEDIA_PERMISSION));}
        @JavascriptInterface public boolean setTorch(boolean enabled){if(torchId==null)return false;if(checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED)return false;
            try{cameraManager.setTorchMode(torchId,enabled);torchOn=enabled;return true;}catch(Exception e){return false;}}
        @JavascriptInterface public void saveBase64File(String filename,String mime,String base64){try{byte[] data=android.util.Base64.decode(base64,android.util.Base64.DEFAULT);runOnUiThread(()->{
            pendingBytes=data;pendingMime=mime;Intent create=new Intent(Intent.ACTION_CREATE_DOCUMENT);create.addCategory(Intent.CATEGORY_OPENABLE);create.setType(mime==null?"application/octet-stream":mime);create.putExtra(Intent.EXTRA_TITLE,filename);startActivityForResult(create,FILE_SAVE);
        });}catch(Exception ignored){}}
    }
    @Override public void onRequestPermissionsResult(int code,String[] perms,int[] grants){super.onRequestPermissionsResult(code,perms,grants);if(code!=MEDIA_PERMISSION)return;PermissionRequest r=pendingPermission;pendingPermission=null;if(r==null)return;boolean granted=true;for(String resource:r.getResources()){if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)&&checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED)granted=false;if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)&&checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED)granted=false;}if(granted)r.grant(r.getResources());else r.deny();}
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){super.onActivityResult(requestCode,resultCode,data);if(requestCode==FILE_CHOOSE){if(fileCallback!=null){fileCallback.onReceiveValue(resultCode==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);fileCallback=null;}}else if(requestCode==FILE_SAVE){if(resultCode==RESULT_OK&&data!=null&&pendingBytes!=null){try(OutputStream stream=getContentResolver().openOutputStream(data.getData())){if(stream!=null)stream.write(pendingBytes);}catch(Exception ignored){}}pendingBytes=null;}}
    @Override protected void onPause(){super.onPause();if(torchOn){try{cameraManager.setTorchMode(torchId,false);}catch(Exception ignored){}torchOn=false;}}
    @Override protected void onDestroy(){if(pendingPermission!=null)pendingPermission.deny();if(fileCallback!=null)fileCallback.onReceiveValue(null);if(web!=null){web.destroy();web=null;}super.onDestroy();}
    @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
}
