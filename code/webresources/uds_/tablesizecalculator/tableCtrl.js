angular.module('tableApp', ['ngDialog', 'ngAnimate', 'ui.bootstrap'])
    .controller('tableCtrl', ['$scope', 'ngDialog', 'modalWindowLoader', function ($scope, ngDialog, modalWindowLoader) {
        var url = "https://" + window.location.host;
        var concurrentRequests = 0, concurrentRequestsTreshold = 10;

        $scope.dataTables = [];
        $scope.entitiesAmount = 1;
        $scope.maxValueOfProgressBar = 100;
        modalWindowLoader.modalWindowLoaderOpen();
        $scope.currentProgressBar = 0;
        $scope.dynamicValueOfProgressBar = 0;

        function counterForProgressBarUpdate(rowObj) {
            concurrentRequests--;

            rowObj.isLoading = false;
            $scope.currentProgressBar++;
            $scope.dynamicValueOfProgressBar = ($scope.currentProgressBar * 100) / $scope.entitiesAmount;
            $scope.$apply();
        };

        Process.callAction("uds_GetTablesList", [], function (data) {
            var rows = JSON.parse(data.Tables);

            $scope.entitiesAmount = rows.length;
            $scope.$apply();

            processRows(rows);
        }, function (error) {
            console.log('uds_GetTablesList ' + error);
        }, url);

        function processRows(rows) {

            if (!angular.isArray(rows)) {
                alert('data are not correct!!');
            }

            var id = 0;
            var timer = setInterval(function () {
                if (concurrentRequests < concurrentRequestsTreshold && id < rows.length) {
                    concurrentRequests++;

                    var rowObj = {
                        systemName: rows[id],
                        id: id++
                    }

                    $scope.dataTables.push(rowObj);
                    return getRowCells(rowObj);
                }

                if (id == rows.length - 1) {
                    clearInterval(timer);
                }
            }, 100);

            modalWindowLoader.modalWindowLoaderClose();

            $scope.$apply();
        };

        function getRowCells(rowObj) {
            return new Promise(function (resolve, reject) {
                rowObj.isError = false;
                rowObj.isLoading = true;
                Process.callAction("uds_GetTableSize", [{

                    key: "Table",
                    type: Process.Type.String,
                    value: rowObj.systemName

                }], function (data) {

                    rowObj.PagingCoockieOut = data.PagingCoockieOut;
                    rowObj.MoreRecords = data.MoreRecords;

                    var metrics = JSON.parse(data.Metrics);
                    rowObj.count = parseInt(metrics.RecordCount);
                    rowObj.size = metrics.Size;
                    rowObj.displayName = metrics.DisplayName;
                    rowObj.sizeOrder = -metrics.Size; //specially for reverse sorting
                    rowObj.page = 1;

                    getRowForNewPage(rowObj)
                        .then(function (response) {
                            counterForProgressBarUpdate(rowObj);
                            resolve();
                        }, function (error) {
                            counterForProgressBarUpdate(rowObj);
                            reject();
                        });

                }, function (error) {
                    console.log('getRowCells ' + error);
                    rowObj.isLoading = false;
                    rowObj.isError = true;

                    reject();
                }, url);
            });
        };

        function getRowForNewPage(rowObj) {
            return new Promise(function (resolve, reject) {
                if (rowObj.MoreRecords) {
                    rowObj.page++;
                    Process.callAction("uds_GetTableSize", [{
                        key: "Table",
                        type: Process.Type.String,
                        value: rowObj.systemName
                    },
                    {
                        key: "Page",
                        type: Process.Type.Int,
                        value: rowObj.page
                    },
                    {
                        key: "PagingCoockieIn",
                        type: Process.Type.String,
                        value: rowObj.PagingCoockieOut
                    }], function (data) {

                        rowObj.PagingCoockieOut = data.PagingCoockieOut;
                        rowObj.MoreRecords = data.MoreRecords;
                        var metrics = JSON.parse(data.Metrics);
                        var count = parseInt(metrics.RecordCount);
                        var size = parseInt(metrics.Size);

                        rowObj.count += count;
                        rowObj.size += size;
                        rowObj.sizeOrder += (-size);//specially for reverse sorting

                        if (rowObj.MoreRecords) {
                            getRowForNewPage(rowObj)
                                .then(function (response) {
                                    resolve();
                                }, function (error) {
                                    reject();
                                });
                        } else {
                            resolve();
                        }

                    }, function (error) {
                        console.log('getRowForNewPage ' + error);
                        rowObj.isLoading = false;
                        rowObj.isError = true;

                        reject();
                    }, url);
                } else {
                    resolve();
                }
            });
        }
    }])

    .factory('modalWindowLoader', function modalWindowLoader(ngDialog) {
        'use strict';
        return {
            modalWindowLoaderOpen: modalWindowLoaderOpen,
            modalWindowLoaderClose: modalWindowLoaderClose
        };
        function modalWindowLoaderOpen() {
            return ngDialog.open({
                template: '<div>' + '<img src="/WebResources/uds_/tablesizecalculator/icon.gif" style="margin-left: 45%" ' + '</div>',
                className: 'ngdialog-theme-default',
                plain: true,
            });
        };
        function modalWindowLoaderClose() {
            return ngDialog.closeAll();
        };
    })
    .config(function (ngDialogProvider) {
        ngDialogProvider.setDefaults({
            showClose: false,
            closeByDocument: true,
            closeByEscape: true
        });
    })