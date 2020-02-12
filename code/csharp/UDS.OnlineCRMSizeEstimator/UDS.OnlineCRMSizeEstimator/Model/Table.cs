using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace UDS.OnlineCRMSizeEstimator.Model
{
    [DataContract]
    public class Table
    {
        [DataMember]
        public string Name { get; set; }

        [DataMember]
        public string DisplayName { get; set; }

        [DataMember]
        public int RecordCount { get; set; }

        [DataMember]
        public int Size { get; set; }
    }
}
