var UDS = UDS || {};
UDS.MigrationCalculator = UDS.MigrationCalculator || {};
UDS.MigrationCalculator.Form = UDS.MigrationCalculator.Form || {};
UDS.MigrationCalculator.Data = UDS.MigrationCalculator.Data || {};
UDS.MigrationCalculator.WebApi = UDS.MigrationCalculator.WebApi || {};

UDS.MigrationCalculator.Form.OnLoad = function () {
    UDS.MigrationCalculator.Form.HideButton();
    UDS.MigrationCalculator.Form.HideInformationSection();
    if (UDS.MigrationCalculator.WebApi.IsRestAvailable())
        UDS.MigrationCalculator.Data.MigrationRequest();
    else
        UDS.MigrationCalculator.Data.MigrationRequestSOAP();
};

UDS.MigrationCalculator.Form.ShowLoader = function () {
    document.getElementById("loader").style.display = "block";
};

UDS.MigrationCalculator.Form.HideLoader = function () {
    document.getElementById("loader").style.display = "none";
};

UDS.MigrationCalculator.Form.HideButton = function () {
    document.getElementById("run-button").style.display = "none";
};

UDS.MigrationCalculator.Form.HideInformationSection = function () {
    document.getElementById("information").style.display = "none";
};

UDS.MigrationCalculator.Form.ToggleListInformation = function () {
    const list = document.getElementById("list-info");
    list.style.display === "none" ? list.style.display = "block" : list.style.display = "none";
};

UDS.MigrationCalculator.Form.UpdateStatusText = function (message) {
    document.getElementById("statusText").innerHTML = message;
};

UDS.MigrationCalculator.Form.UpdateStatusTitle = function (message) {
    document.getElementById("statusTitle").innerText = message;
};

UDS.MigrationCalculator.Form.UpdateStatusHint = function (message) {
    document.getElementById("statusHint").innerText = message;
};

UDS.MigrationCalculator.Form.UpdateCalculationText = function (message) {
    document.getElementById("calculation").innerText = message;
};

UDS.MigrationCalculator.Form.HandleError = function (statusTitle) {
    statusTitle = statusTitle || "Ooops... Add-on was unable to connect to our server.";

    UDS.MigrationCalculator.Form.HideLoader();

    UDS.MigrationCalculator.Form.UpdateStatusTitle(statusTitle);
    UDS.MigrationCalculator.Form.UpdateStatusHint("");
    UDS.MigrationCalculator.Form.UpdateCalculationText("");

    let statusText =
        "<span>Check your internet connection and try again later or <a href='https://uds.systems/contact-us' target='_blank'>contact us</a>.</span>";
    UDS.MigrationCalculator.Form.UpdateStatusText(statusText);
}

UDS.MigrationCalculator.Data.EntitiesDataSize = [];

UDS.MigrationCalculator.Data.MigrationRequest = function () {
    UDS.MigrationCalculator.Form.ShowLoader();
    UDS.MigrationCalculator.Form.UpdateStatusTitle("Loading entities metadata");

    let calculationRequest = {
        Data: {},
        Metadata: {}
    };

    let baseUrl = UDS.MigrationCalculator.WebApi.GetServiceUrl();
    let link = baseUrl + '/uds_MigrationCalculatorGetMetadata';

    let request = {
        uri: link,
        method: "POST",
        data: {}
    };

    UDS.MigrationCalculator.WebApi.Execute(request)
        .then(function (response) {
            calculationRequest.Metadata = JSON.parse(response.CalculationMetadata);
            calculationRequest.Metadata.CrmAddress = UDS.MigrationCalculator.WebApi.GetClientUrl();

            UDS.MigrationCalculator.Data.CalculateDataSize()
                .then(function (response) {
                    calculationRequest.Data = response;

                    UDS.MigrationCalculator.Data.SendCalculationRequest(calculationRequest);
                }, function (error) {
                    console.error(error);
                });
        }, function (error) {
            UDS.MigrationCalculator.Form.HandleError();

            console.log(error);
        });
};

UDS.MigrationCalculator.Data.MigrationRequestSOAP = function () {
    UDS.MigrationCalculator.Form.ShowLoader();
    UDS.MigrationCalculator.Form.UpdateStatusTitle("Loading entities metadata");

    let requestXml = "\
        <s:Envelope xmlns:s='http://schemas.xmlsoap.org/soap/envelope/'>\
            <s:Body>\
                <Execute xmlns='http://schemas.microsoft.com/xrm/2011/Contracts/Services' xmlns:i='http://www.w3.org/2001/XMLSchema-instance'>\
                    <request xmlns:a='http://schemas.microsoft.com/xrm/2011/Contracts'>\
                        <a:Parameters xmlns:b='http://schemas.datacontract.org/2004/07/System.Collections.Generic'>\
                        </a:Parameters>\
                        <a:RequestId i:nil='true' />\
                        <a:RequestName>uds_MigrationCalculatorGetMetadata</a:RequestName>\
                    </request>\
                </Execute>\
            </s:Body>\
        </s:Envelope>";

    let opts = {
        uri: UDS.MigrationCalculator.WebApi.GetServiceUrl(),
        method: "POST",
        requestXml: requestXml
    };

    UDS.MigrationCalculator.WebApi.ExecuteSoap(opts)
        .then(function (responseXml) {
            let response = responseXml.match(/(?<=http:\/\/www\.w3\.org\/2001\/XMLSchema">)(.*)(?=<\/b:value><)/);
            if (response[0]) {
                let request = {
                    Data: {},
                    Metadata: JSON.parse(response[0])
                };

                request.Metadata.CrmAddress = UDS.MigrationCalculator.WebApi.GetClientUrl();

                UDS.MigrationCalculator.Data.CalculateDataSizeSOAP()
                    .then(function (response) {
                        request.Data = response;

                        UDS.MigrationCalculator.Data.SendCalculationRequest(request);
                    }, function (error) {
                        UDS.MigrationCalculator.Form.HandleError();

                        console.error(error);
                    });
            }
        }, function (errorXml) {
            UDS.MigrationCalculator.Form.HandleError();

            console.error(errorXml);
        });
};

UDS.MigrationCalculator.Data.CalculateDataSize = function () {
    let baseUrl = UDS.MigrationCalculator.WebApi.GetServiceUrl();
    let link = `${baseUrl}/uds_MigrationCalculatorGetEntitiesList`;

    let request = {
        uri: link,
        method: "POST",
        data: {}
    };

    return new Promise((resolve, reject) => {
        UDS.MigrationCalculator.WebApi.Execute(request)
            .then(async response => {
                let entityNames = JSON.parse(response.Entities);

                let entitiesData = await UDS.MigrationCalculator.Data.GetDataSizeByEntities(entityNames);
                resolve(entitiesData);
            }, error => {
                reject(error);
            });
    });
};

UDS.MigrationCalculator.Data.CalculateDataSizeSOAP = function () {
    let requestXml = "\
        <s:Envelope xmlns:s='http://schemas.xmlsoap.org/soap/envelope/'>\
            <s:Body>\
                <Execute xmlns='http://schemas.microsoft.com/xrm/2011/Contracts/Services' xmlns:i='http://www.w3.org/2001/XMLSchema-instance'>\
                    <request xmlns:a='http://schemas.microsoft.com/xrm/2011/Contracts'>\
                        <a:Parameters xmlns:b='http://schemas.datacontract.org/2004/07/System.Collections.Generic'>\
                        </a:Parameters>\
                        <a:RequestId i:nil='true' />\
                        <a:RequestName>uds_MigrationCalculatorGetEntitiesList</a:RequestName>\
                    </request>\
                </Execute>\
            </s:Body>\
        </s:Envelope>";

    let opts = {
        uri: UDS.MigrationCalculator.WebApi.GetServiceUrl(),
        method: "POST",
        requestXml: requestXml
    };

    return new Promise((resolve, reject) => {
        UDS.MigrationCalculator.WebApi.ExecuteSoap(opts)
            .then(async responseXml => {
                let response = responseXml.match(/(?<=http:\/\/www\.w3\.org\/2001\/XMLSchema">)(.*)(?=<\/b:value><)/);
                if (response[0]) {
                    let entityNames = JSON.parse(response[0]);

                    let entitiesData = await UDS.MigrationCalculator.Data.GetDataSizeByEntitiesSOAP(entityNames);
                    resolve(entitiesData);
                }
            }, errorXml => {
                reject(errorXml);
            });
    });
};

UDS.MigrationCalculator.Data.GetDataSizeByEntities = async function (entityNames) {
    let entitiesData = {};
    UDS.MigrationCalculator.Form.UpdateStatusTitle("Calculating data size for entities");
    UDS.MigrationCalculator.Form.UpdateStatusHint(`Calculation time depends on number of records in the system`);

    for (const entityName of entityNames) {
        UDS.MigrationCalculator.Form.UpdateStatusText(`Working on ${entityName} entity`);

        entitiesData[entityName] = {
            Name: entityName,
            DisplayName: "",
            RecordCount: 0,
            Size: 0
        };

        //await UDS.MigrationCalculator.Data.GetEntityDataSize(entitiesData, entityName);
        await UDS.MigrationCalculator.Data.GetEntityRecordsAmount(entitiesData, entityName);
    }

    return entitiesData;
};

UDS.MigrationCalculator.Data.GetDataSizeByEntitiesSOAP = async function (entityNames) {
    let entitiesData = {};
    UDS.MigrationCalculator.Form.UpdateStatusTitle("Calculating data size for entities");
    UDS.MigrationCalculator.Form.UpdateStatusHint(`Calculation time depends on number of records in the system`);

    for (const entityName of entityNames) {
        UDS.MigrationCalculator.Form.UpdateStatusText(`Working on ${entityName} entity`);

        entitiesData[entityName] = {
            Name: entityName,
            DisplayName: "",
            RecordCount: 0,
            Size: 0
        };

        //await UDS.MigrationCalculator.Data.GetEntityDataSize(entitiesData, entityName);
        await UDS.MigrationCalculator.Data.GetEntityRecordsAmountSOAP(entitiesData, entityName);
    }

    return entitiesData;
};

UDS.MigrationCalculator.Data.GetEntityDataSize = function (entitiesData, entityName, page, pagingCookie) {
    page = page || 1;
    pagingCookie = pagingCookie || "";

    return new Promise((resolve, reject) => {
        UDS.MigrationCalculator.Data.GetEntityDataSizeByPage(entityName, page, pagingCookie)
            .then(response => {
                if (response && response.Metrics) {
                    response.Metrics = JSON.parse(response.Metrics);

                    entitiesData[entityName].RecordCount += response.Metrics.RecordCount;
                    entitiesData[entityName].Size += response.Metrics.Size;

                    if (response.MoreRecords) {
                        resolve(UDS.MigrationCalculator.Data.GetEntityDataSize(entitiesData, entityName, ++page, response.PagingCoockieOut));
                    }
                    else
                        resolve();
                }
            }, error => {
                reject(error);
            });
    });
};

UDS.MigrationCalculator.Data.GetEntityRecordsAmount = function (entitiesData, entityName, page, pagingCookie) {
    page = page || 1;
    pagingCookie = pagingCookie || "";

    return new Promise((resolve, reject) => {
        UDS.MigrationCalculator.Data.GetEntityRecordsAmountByPage(entityName, page, pagingCookie)
            .then(response => {
                if (response && response.Metrics) {
                    response.Metrics = JSON.parse(response.Metrics);

                    entitiesData[entityName].RecordCount += response.Metrics.RecordCount;

                    if (response.MoreRecords) {
                        resolve(UDS.MigrationCalculator.Data.GetEntityRecordsAmount(entitiesData, entityName, ++page, response.PagingCoockieOut));
                    }
                    else
                        resolve();
                }
            }, error => {
                reject(error);
            });
    });
};

UDS.MigrationCalculator.Data.GetEntityRecordsAmountSOAP = function (entitiesData, entityName, page, pagingCookie) {
    page = page || 1;
    pagingCookie = pagingCookie || "";

    return new Promise((resolve, reject) => {
        UDS.MigrationCalculator.Data.GetEntityRecordsAmountByPageSOAP(entityName, page, pagingCookie)
            .then(responseXml => {
                if (responseXml) {
                    let metricsMatch = responseXml.match(/(?<=<b:key>Metrics<\/b:key><b:value i:type="c:string" xmlns:c="http:\/\/www.w3.org\/2001\/XMLSchema">)(.*)(?=<\/b:value><\/a:KeyValuePairOfstringanyType><a:KeyValuePairOfstringanyType><b:key>MoreRecords)/);
                    let metrics = metricsMatch && JSON.parse(metricsMatch[0]);

                    let moreRecordsMatch = responseXml.match(/(?<=<b:key>MoreRecords<\/b:key><b:value i:type="c:boolean" xmlns:c="http:\/\/www.w3.org\/2001\/XMLSchema">)(.*)(?=<\/b:value><\/a:KeyValuePairOfstringanyType><a:KeyValuePairOfstringanyType><b:key>PagingCookieOut)/);
                    let moreRecords = "true" === (moreRecordsMatch && moreRecordsMatch[0] || "");

                    let pagingCookieOutMatch = responseXml.match(/(?<=<b:key>PagingCookieOut<\/b:key><b:value i:type="c:string" xmlns:c="http:\/\/www.w3.org\/2001\/XMLSchema">)(.*)(?=<\/b:value>)/);
                    let pagingCookieOut = pagingCookieOutMatch && pagingCookieOutMatch[0] || "";

                    if (metrics) {
                        entitiesData[entityName].RecordCount += metrics.RecordCount;

                        if (moreRecords) {
                            resolve(UDS.MigrationCalculator.Data.GetEntityRecordsAmountSOAP(entitiesData, entityName, ++page, pagingCookieOut));
                        }
                        else
                            resolve();
                    }
                }
            }, error => {
                reject(error);
            });
    });
};

UDS.MigrationCalculator.Data.GetEntityRecordsAmountByPage = function (entityName, page, pagingCookie) {
    let baseUrl = UDS.MigrationCalculator.WebApi.GetServiceUrl();
    let link = `${baseUrl}/uds_MigrationCalculatorGetEntityRecordsAmount`;

    let params = {
        EntityName: entityName,
        Page: page,
        PagingCookieIn: pagingCookie
    };

    let request = {
        uri: link,
        method: "POST",
        data: params
    };

    return UDS.MigrationCalculator.WebApi.Execute(request);
};

UDS.MigrationCalculator.Data.GetEntityRecordsAmountByPageSOAP = function (entityName, page, pagingCookie) {
    let requestXml = '\
        <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
            <s:Body>\
                <Execute xmlns="http://schemas.microsoft.com/xrm/2011/Contracts/Services" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">\
                    <request xmlns:a="http://schemas.microsoft.com/xrm/2011/Contracts">\
                        <a:Parameters xmlns:b="http://schemas.datacontract.org/2004/07/System.Collections.Generic">\
                            <a:KeyValuePairOfstringanyType>\
                                <b:key>EntityName</b:key>\
                                <b:value i:type="c:string" xmlns:c="http://www.w3.org/2001/XMLSchema">' + entityName + '</b:value>\
                            </a:KeyValuePairOfstringanyType>\
                            <a:KeyValuePairOfstringanyType>\
                                <b:key>PagingCookieIn</b:key>\
                                <b:value i:type="c:string" xmlns:c="http://www.w3.org/2001/XMLSchema">' + pagingCookie + '</b:value>\
                            </a:KeyValuePairOfstringanyType>\
                            <a:KeyValuePairOfstringanyType>\
                                <b:key>Page</b:key>\
                                <b:value i:type="c:int" xmlns:c="http://www.w3.org/2001/XMLSchema">' + page + '</b:value>\
                            </a:KeyValuePairOfstringanyType>\
                        </a:Parameters>\
                        <a:RequestId i:nil="true" />\
                        <a:RequestName>uds_MigrationCalculatorGetEntityRecordsAmount</a:RequestName>\
                    </request>\
                </Execute>\
            </s:Body>\
        </s:Envelope>';

    let opts = {
        uri: UDS.MigrationCalculator.WebApi.GetServiceUrl(),
        method: "POST",
        requestXml: requestXml
    };

    return UDS.MigrationCalculator.WebApi.ExecuteSoap(opts)
};

UDS.MigrationCalculator.Data.GetEntityDataSizeByPage = function (entityName, page, pagingCookie) {
    let baseUrl = UDS.MigrationCalculator.WebApi.GetServiceUrl();
    let link = `${baseUrl}/uds_MigrationCalculatorGetEntityDataSize`;

    let params = {
        EntityName: entityName,
        Page: page,
        PagingCookieIn: pagingCookie
    };

    let request = {
        uri: link,
        method: "POST",
        data: params
    };

    return UDS.MigrationCalculator.WebApi.Execute(request);
};

UDS.MigrationCalculator.Data.SendCalculationRequest = function (data) {
    UDS.MigrationCalculator.Form.UpdateStatusTitle("Calculating price");
    UDS.MigrationCalculator.Form.UpdateStatusHint("");
    UDS.MigrationCalculator.Form.UpdateStatusText("");

    let url = "https://uds-migration-calculator.azurewebsites.net/api/CalculatePrice";

    let opts = {
        method: "POST",
        uri: url,
        data: data
    };

    UDS.MigrationCalculator.WebApi.Execute(opts)
        .then(response => {
            UDS.MigrationCalculator.Form.UpdateStatusText("");
            UDS.MigrationCalculator.Form.UpdateStatusTitle("");
            UDS.MigrationCalculator.Form.UpdateStatusHint("");
            UDS.MigrationCalculator.Form.UpdateCalculationText("Contact us to schedule a consultation meeting on migration process.");

            document.getElementById("statusText").classList.add('animation-start');

            if (response.isBelowThreshold)
                UDS.MigrationCalculator.Form.UpdateStatusText("<span>We can migrate your CRM for free! You can contact us <a href='https://uds.systems/contact-us' target='_blank'>here</a>.</span>");
            else
                UDS.MigrationCalculator.Form.UpdateStatusText("Total price: <span class='price'>" + parseInt(response.price) + "$</span>" + " (customization, logic and data migration included)");
            setTimeout(() => {
                document.getElementById("statusText").classList.add('animation-end');
                document.getElementById("contact-info").classList.add('animation-contacts');
            }, 500);

            UDS.MigrationCalculator.Form.HideLoader();
        }, error => {
            UDS.MigrationCalculator.Form.HandleError();

            console.error(error);
        });
};

UDS.MigrationCalculator.WebApi.ServiceUrl = "";

UDS.MigrationCalculator.WebApi.IsRestAvailable = function () {
    if (!UDS.MigrationCalculator.WebApi.ServiceUrl)
        UDS.MigrationCalculator.WebApi.ServiceUrl = UDS.MigrationCalculator.WebApi.GetServiceUrl();

    if (UDS.MigrationCalculator.WebApi.ServiceUrl.includes("api/data/v"))
        return true;

    return false;
};

UDS.MigrationCalculator.WebApi.GetServiceUrl = function () {
    if (UDS.MigrationCalculator.WebApi.ServiceUrl)
        return UDS.MigrationCalculator.WebApi.ServiceUrl;

    let urlBase = UDS.MigrationCalculator.WebApi.GetClientUrl();
    let apiVersion = UDS.MigrationCalculator.WebApi.GetWebApiVersion();
    let apiEndpoint = "";

    if (apiVersion && apiVersion[0] < 8)
        apiEndpoint = "XRMServices/2011/Organization.svc/web";
    else
        apiEndpoint = `api/data/v${apiVersion}`;

    return UDS.MigrationCalculator.WebApi.ServiceUrl = `${urlBase}/${apiEndpoint}`;
};

UDS.MigrationCalculator.WebApi.GetClientUrl = function () {
    var context = null;

    if (typeof GetGlobalContext == 'function') {
        context = GetGlobalContext();
    } else if (typeof Xrm != 'undefined') {
        context = Xrm.Page.context;
    }
    else if (typeof parent.Xrm != 'undefined') {
        context = parent.Xrm.Page.context;
    }

    return context.getClientUrl();
};

UDS.MigrationCalculator.WebApi.GetWebApiVersion = function () {
    //8.2 or below
    let apiVersion = Xrm && Xrm.Page && Xrm.Page.context && Xrm.Page.context.getVersion && Xrm.Page.context.getVersion();

    //9+
    if (!apiVersion)
        apiVersion = Xrm && Xrm.Utility &&
            Xrm.Utility.getGlobalContext && Xrm.Utility.getGlobalContext() &&
            Xrm.Utility.getGlobalContext().getVersion && Xrm.Utility.getGlobalContext().getVersion();

    if (!apiVersion)
        return "6.1";

    return apiVersion.substring(0, 3);
};

UDS.MigrationCalculator.WebApi.Execute = function (opts) {
    return new Promise(function (resolve, reject) {
        var request = new XMLHttpRequest();
        request.open(opts.method, encodeURI(opts.uri), true);
        request.setRequestHeader("OData-MaxVersion", "4.0");
        request.setRequestHeader("OData-Version", "4.0");
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("Content-Type", "application/json; charset=utf-8");

        request.onreadystatechange = function () {
            if (this.readyState === 4) {
                request.onreadystatechange = null;
                switch (this.status) {
                    case 200: // Success with content returned in response body.
                    case 204: // Success with no content returned in response body.
                    case 304: // Success with Not Modified
                        resolve(JSON.parse(this.responseText));
                        break;
                    default: // All other statuses are error cases.
                        var error;
                        try {
                            error = JSON.parse(request.response).error;
                        } catch (e) {
                            error = new Error("Unexpected Error");
                        }
                        reject(error);
                        break;
                }
            }
        };

        if (opts.method == "POST")
            request.send(JSON.stringify(opts.data));
        else if (opts.method == "GET")
            request.send();
    });
};

UDS.MigrationCalculator.WebApi.ExecuteSoap = function (opts) {
    return new Promise(function (resolve, reject) {
        let request = new XMLHttpRequest();
        request.open(opts.method, encodeURI(opts.uri), true);
        request.setRequestHeader("SOAPAction", "http://schemas.microsoft.com/xrm/2011/Contracts/Services/IOrganizationService/Execute");
        request.setRequestHeader("Accept", "application/xml, text/xml, */*");
        request.setRequestHeader("Content-Type", "text/xml; charset=utf-8");

        request.onreadystatechange = function () {
            if (this.readyState === 4) {
                request.onreadystatechange = null;
                switch (this.status) {
                    case 200: // Success with content returned in response body.
                    case 204: // Success with no content returned in response body.
                    case 304: // Success with Not Modified
                        resolve(this.responseText);
                        break;
                    default: // All other statuses are error cases.
                        let error;
                        try {
                            error = request.response;
                        } catch (e) {
                            error = new Error("Unexpected Error");
                        }
                        reject(error);
                        break;
                }
            }
        };

        if (opts.method == "POST")
            request.send(opts.requestXml);
        else if (opts.method == "GET")
            request.send();
    });
}
