# 例子 狐猴浏览器 其他支持的浏览器类似同样操作
例子 
需要访问Android/data/目录，3个文件放入：
```
/storage/emulated/0/Android/data/com.lemurbrowser.exts/files/Download/
```

狐猴浏览器设置主页为
```
file:///storage/emulated/0/Android/data/com.lemurbrowser.exts/files/Download/index.html
```

js插件配置好目录

```
const localNavPagePath = "file:///storage/emulated/0/Android/data/com.lemurbrowser.exts/files/Download/index.html";
````