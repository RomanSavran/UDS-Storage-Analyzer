using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Metadata;
using Microsoft.Xrm.Sdk.Query;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using UDS.OnlineCRMSizeEstimator.Model;

namespace UDS.OnlineCRMSizeEstimator
{
    public class GetTableSize : IPlugin
    {
        public void Execute(IServiceProvider serviceProvider)
        {
            var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            var serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
            var service = serviceFactory.CreateOrganizationService(context.UserId);

            string tableName = (string)context.InputParameters["Table"];

            int page = 1;

            if (context.InputParameters.Contains("Page"))
            {
                page = (int)context.InputParameters["Page"];
            }

            if (page <= 0)
            {
                page = 1;
            }

            RetrieveEntityRequest request = new RetrieveEntityRequest()
            {
                EntityFilters = EntityFilters.Attributes | EntityFilters.Entity,
                LogicalName = tableName,
                RetrieveAsIfPublished = true                           
            };

            RetrieveEntityResponse response = (RetrieveEntityResponse)service.Execute(request);

            int booleanColumns = 0;
            int rowSize = 0;
            string tableDisplayName = String.Empty;
            List<string> variableWidth = new List<string>();

            foreach (var attribute in response.EntityMetadata.Attributes)
            {

                switch (attribute.AttributeType.Value)
                {
                    case AttributeTypeCode.Boolean:
                        booleanColumns++;
                        break;
                    case AttributeTypeCode.Customer:
                    case AttributeTypeCode.Lookup:
                    case AttributeTypeCode.Owner:
                    case AttributeTypeCode.Uniqueidentifier:
                        rowSize += 16;
                        break;
                    case AttributeTypeCode.BigInt:
                        rowSize += 8;
                        break;
                    case AttributeTypeCode.DateTime:
                        rowSize += 8;
                        break;
                    case AttributeTypeCode.Integer:
                        rowSize += 4;
                        break;
                    case AttributeTypeCode.Picklist:
                        rowSize += 4;
                        break;
                    case AttributeTypeCode.State:
                        rowSize += 4;
                        break;
                    case AttributeTypeCode.Status:
                        rowSize += 4;
                        break;
                    case AttributeTypeCode.Decimal:
                        rowSize += 13;
                        break;
                    case AttributeTypeCode.Double:
                        rowSize += 8;
                        break;
                    case AttributeTypeCode.Money:
                        rowSize += 8;
                        break;
                    case AttributeTypeCode.String:
                    case AttributeTypeCode.Memo:
                        if (attribute.IsRetrievable == true || attribute.SchemaName.ToLower() == "documentbody" || attribute.SchemaName.ToLower() == "body")
                            variableWidth.Add(attribute.LogicalName);
                        break;
                    case AttributeTypeCode.PartyList:
                    case AttributeTypeCode.CalendarRules:
                    case AttributeTypeCode.Virtual:
                    case AttributeTypeCode.ManagedProperty:
                    case AttributeTypeCode.EntityName:
                        break;
                    default:
                        break;
                }
            }

            var requestEntities = new QueryExpression(tableName)
            {
                ColumnSet = new ColumnSet(variableWidth.ToArray()),
                PageInfo = new PagingInfo()
                {
                    Count = 10,
                    PageNumber = page
                }
            };

            if (context.InputParameters.Contains("PagingCoockieIn"))
            {
                requestEntities.PageInfo.PagingCookie = (string)context.InputParameters["PagingCoockieIn"];
            }

            var entities = service.RetrieveMultiple(requestEntities);

            int charSize = 0;

            foreach (var entity in entities.Entities)
            {
                foreach (var attribute in variableWidth)
                {
                    string value = entity.GetAttributeValue<string>(attribute);

                    if (!string.IsNullOrEmpty(value))
                    {
                        charSize += value.Length;
                    }
                }
            }

            rowSize += 1 + (booleanColumns - 1) / 8;

            int TotalSize = ((rowSize * entities.Entities.Count + charSize) / 1024 / 8 + 1) * 8;

            if (response.EntityMetadata.DisplayName != null && response.EntityMetadata.DisplayName.UserLocalizedLabel != null)
            {
                tableDisplayName = response.EntityMetadata.DisplayName.UserLocalizedLabel.Label;
            }

            context.OutputParameters["PagingCoockieOut"] = entities.PagingCookie;

            context.OutputParameters["MoreRecords"] = entities.MoreRecords;

            context.OutputParameters["Metrics"] = JsonSerializer.Serialize<Table>(
                new Table
                {
                    Name = tableName,
                    DisplayName = tableDisplayName,
                    RecordCount = entities.Entities.Count,
                    Size = TotalSize
                });
        }

        private string XmlEscape(string unescaped)
        {
            XmlDocument doc = new XmlDocument();
            XmlNode node = doc.CreateElement("root");
            node.InnerText = unescaped;
            return node.InnerXml;
        }

        private string XmlUnescape(string escaped)
        {
            XmlDocument doc = new XmlDocument();
            XmlNode node = doc.CreateElement("root");
            node.InnerXml = escaped;
            return node.InnerText;
        }
    }
}
