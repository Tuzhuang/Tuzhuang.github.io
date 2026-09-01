---
title: "struts2如何继承ActionSupport例子?"
date: 2018-10-31
author: shaozhuangGui
tag:
  - 后端
source: https://blog.csdn.net/shaozhuangGui/article/details/83618698
---

# STRUTS2如何继承ACTIONSUPPORT例子?

本文详细介绍了如何使用 Struts2 框架创建项目，包括导入 jar 包、配置 struts2.xml、设置 web.xml 过滤器及编写 HTML 登录页面的过程。通过示例代码展示了 HelloWorldAction 类的创建与验证逻辑，以及登录页面与显示页面的设计。

## 1. HelloWorldAction

第一步打开开发软件，然后创建新的 struts2 项目，然后把 jar 包导入到 lib 文件里面，然后创建 `HelloWorldAction`：

```java
package com.hnpi.action;
import com.opensymphony.xwork2.ActionSupport;
public class HelloWorldAction extends ActionSupport {
    private String account;
    private String password;
    private String submitFlag;

    public String execute() throws Exception {
        this.businessExecute();
        return "toWelcome";
    }

    public void validate(){
        if(account==null || account.trim().length()==0){
            this.addFieldError("account", "账号不可以为空");
        }
        if(password==null || password.trim().length()==0){
            this.addFieldError("password", "密码不可以为空");
        }
        if(password!=null && !"".equals(password.trim()) && password.trim().length()<6){
            this.addFieldError("password", "密码长度至少为6位");
        }
    }

    /**
     * 示例方法，表示可以执行业务逻辑处理的方法，
     */
    public void businessExecute(){
        System.out.println("用户输入的参数为==="+"account="+account+",password="+password+",submitFlag="+submitFlag);
    }

    public String getAccount() {
        return account;
    }

    public void setAccount(String account) {
        this.account = account;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getSubmitFlag() {
        return submitFlag;
    }

    public void setSubmitFlag(String submitFlag) {
        this.submitFlag = submitFlag;
    }
}
```

## 2. struts.xml

新建一个 struts2.xml 的包：

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE struts PUBLIC
    "-//Apache Software Foundation//DTD Struts Configuration 2.0//EN"
    "http://struts.apache.org/dtds/struts-2.0.dtd">
<struts>
    <constant name="struts.custom.i18n.resources" value="messages_en_US"/>
    <package name="default" extends="struts-default">
        <action name="t1" class="com.hnpi.action.RegisterAction">
            <result name="success">/index.jsp</result>
        </action>
    </package>

    <package name="helloworld"  extends="struts-default">
        <action name="helloworldAction" class="com.hnpi.action.HelloWorldAction">
            <result name="toWelcome">/index.jsp</result>
            <result name="input">/register.jsp</result>
        </action>
    </package>
</struts>
```

## 3. web.xml

接下来添加过滤器：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<web-app version="3.0"
    xmlns="http://java.sun.com/xml/ns/javaee"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://java.sun.com/xml/ns/javaee http://java.sun.com/xml/ns/javaee/web-app_3_0.xsd">

    <welcome-file-list>
        <welcome-file>index.jsp</welcome-file>
    </welcome-file-list>

    <filter>
        <filter-name>struts2</filter-name>
        <filter-class>org.apache.struts2.dispatcher.ng.filter.StrutsPrepareAndExecuteFilter</filter-class>
    </filter>

    <filter-mapping>
        <filter-name>struts2</filter-name>
        <url-pattern>/*</url-pattern>
    </filter-mapping>
</web-app>
```

## 4. 页面代码

### 登录页面

```jsp
<%@ page language="java" contentType="text/html; charset=utf-8"
    pageEncoding="utf-8"%>
<%@ taglib prefix="s" uri="/struts-tags"%>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; utf-8">
<title>Insert title here</title>
<style type="text/css">
ul,li {
    list-style-type:none;
    margin:0px;
    float:left;
}
</style>
</head>
<body>
    <form action="helloworldAction.action" method="post">
    <input type="hidden" name="submitFlag" value="login"/>
    <div>
        <font color=red><s:fielderror fieldName="account"/></font>
        <br/>
          账号:<input type="text" name="account">
    </div>
    <div>
        <font color=red><s:fielderror fieldName="password"/></font>
        <br/>
            密码:<input type="password" name="password">
    </div>
    <input type="submit" value="提交">   </form>
</body>
</html>
```

### 显示页面

```jsp
<%@ page language="java" import="java.util.*" pageEncoding="utf-8"%>
<% String path = request.getContextPath(); String basePath =
request.getScheme()+"://"+request.getServerName()+":"+request.getServerName()+path+"/"; %>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
  <head>
    <base href="<%=basePath%>">

    <title>显示页面</title>
   </head>
     <body>

    用户名：\{requestScope.name\}	<br/>
    性别   \{requestScope.sex\}<br/>
    </body>
    </html>
```

> 注：原文为 EL 表达式 `$\{requestScope.name\}`，为避免 VitePress 模板变量解析，此处使用 `\{...\}` 表示。

## 5. 效果

好了代码已经全部书写完成，这样就代表运行成功！！！