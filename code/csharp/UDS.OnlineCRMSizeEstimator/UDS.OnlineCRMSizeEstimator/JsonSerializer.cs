using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;

namespace UDS.OnlineCRMSizeEstimator
{
    public class JsonSerializer
    {
        public static string Serialize<T>(T value)
        {
            MemoryStream stream1 = new MemoryStream();
            DataContractJsonSerializer ser = new DataContractJsonSerializer(typeof(T));
            ser.WriteObject(stream1, value);
            stream1.Position = 0;
            StreamReader sr = new StreamReader(stream1);
            return sr.ReadToEnd();
        }

        public static T DeSerialize<T>(string value)
        {
            MemoryStream stream1 = new MemoryStream();
            ASCIIEncoding uniEncoding = new ASCIIEncoding();

            var sw = new StreamWriter(stream1, uniEncoding);
            sw.Write(value);
            sw.Flush();//otherwise you are risking empty stream

            DataContractJsonSerializer ser = new DataContractJsonSerializer(typeof(T));

            stream1.Position = 0;
            T obj = (T)ser.ReadObject(stream1);

            return obj;
        }

    }
}
