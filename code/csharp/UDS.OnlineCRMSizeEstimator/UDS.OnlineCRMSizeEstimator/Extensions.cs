using Microsoft.Xrm.Sdk.Metadata;
using System;
using System.Reflection;

namespace UDS.OnlineCRMSizeEstimator
{
    public static class Extensions
    {
        public static bool IsEntityHasDataSource(this EntityMetadata metadata)
        {
            PropertyInfo property = metadata.GetType().GetProperty("DataSourceId");
            if (property != null)
            {
                return property.GetValue(metadata) is Guid value && value != Guid.Empty;
            }

            return false;
        }
    }
}
